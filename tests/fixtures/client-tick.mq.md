We **next_handler = "on_tick"**.
1. `gen` == 3
  We **next_handler = "stop"**.
We **tick = [进入真实回调](browser.after(ms=100, then=`next_handler`))**.