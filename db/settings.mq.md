## schema

`fields` =

| 字段 | 类型 | 可空 |
|------|------|------|
| id | integer | false |
| llm_api_key | text | true |
| llm_base_url | text | true |
| llm_model | text | true |
| asr_api_key | text | true |
| asr_base_url | text | true |
| asr_model | text | true |
| tts_api_key | text | true |
| tts_base_url | text | true |
| tts_model | text | true |
| updated_at | text | true |

**`fields`**

## seed

`rows` =

| id | llm_api_key | llm_base_url | llm_model | asr_api_key | asr_base_url | asr_model | tts_api_key | tts_base_url | tts_model |
|----|-------------|--------------|-----------|-------------|--------------|-----------|-------------|--------------|-----------|
| 1 |  | https://api.openai.com/v1 | gpt-4o-mini |  | https://api.openai.com/v1 | whisper-1 |  | https://api.openai.com/v1 | tts-1 |

**`rows`**
