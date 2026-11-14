"""Process/event bridge for one fixed Marqdo entry. No agent policy lives here."""
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time


def emit(kind, **data):
    print(json.dumps({'kind': kind, 'data': data}, ensure_ascii=False), flush=True)


def main():
    request = json.load(sys.stdin)
    context = request['context']
    project, root = Path(context['project']), Path(context['root'])
    run_id = request['run_id']
    if not run_id or any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_' for c in run_id):
        raise RuntimeError('invalid run identity')
    directory = root / 'data/dialogue/proj/runtime' / run_id
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    private = directory / 'request.json'
    descriptor = os.open(private, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        json.dump(request, output, ensure_ascii=False)
    actor = directory / 'actor.json'
    actor.write_text(json.dumps(context, ensure_ascii=False))
    actor.chmod(0o600)
    journal = directory / 'events.ndjson'
    environment = {**os.environ, 'QDAGENT_RUN_REQUEST_FILE': str(private),
                   'QDAGENT_ACTOR_FILE': str(actor), 'MARQDO_LIB': str(project/'lib'),
                   'MARQDO_EXT': str(project/'ext')}
    command = ['marqdo', 'call', str(project/'ext/root-skill/index.mq.md'), 'run',
               '--args-json', '-', '--fs-root', context['workspace'], '--effects',
               'plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read', '--json']
    child = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, cwd=context['workspace'], env=environment)
    captured = []
    transfer = threading.Thread(target=lambda: captured.append(child.communicate(json.dumps({'context':context}).encode())))
    transfer.start()
    position = 0
    while transfer.is_alive():
        position = relay(journal, position)
        transfer.join(.04)
    position = relay(journal, position)
    stdout, stderr = captured[0]
    (directory/'entry.stdout').write_bytes(stdout[:4*1024*1024])
    (directory/'entry.stderr').write_bytes(stderr[:65536])
    if len(stdout) > 4*1024*1024 or child.returncode:
        detail='Marqdo entry process failed: '+str(child.returncode)
        try:detail=json.loads(stdout).get('error',{}).get('message',detail)
        except (ValueError,AttributeError):pass
        raise RuntimeError(detail[:400])
    envelope = json.loads(stdout)
    if envelope.get('ok') is not True:
        raise RuntimeError(str(envelope.get('error', {}))[:400])
    result = envelope['result']
    if not isinstance(result, dict) or not isinstance(result.get('answer'), str) or not isinstance(result.get('status'), str):
        raise RuntimeError('Marqdo entry returned an invalid event envelope')
    emit('final', **result)


def relay(path, position):
    try:
        with path.open() as source:
            source.seek(position)
            while True:
                start = source.tell()
                line = source.readline()
                if not line or not line.endswith('\n'):
                    return start
                event = json.loads(line)
                emit(event['kind'], **event['data'])
    except FileNotFoundError:
        return position


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        message = str(error)[:400] if isinstance(error, RuntimeError) else 'execution transport failed'
        emit('error', message=message)
        emit('final', answer=message, status='failed')
        sys.exit(1)
