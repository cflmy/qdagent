# marqdo call 与契约易错点

文本参数必须带字面引号（如 path='"pages"'），裸写会报 call.bad_value；大段源码用 --args-json 传入 JSON，路径相对 --fs-root。

contract check 的官方门槛是裸 marqdo check。形参必须在叙述中被反引号提及才进绑定图（提及即声明），再在可执行面读取才会升参；narrative ratio 不是官方默认门槛。

browser.merge 是顶层键右者优先的浅合并：同一种效果（set_text/set_attr/set_class）要作用于多个选择器时，必须用一个效果 map 携带多个键（table.put 链式构造），跨种效果才用 merge，否则先写的会丢。

View 行的 attrs 记录用多列真实属性名做表头（如 | id | role |），单列表会被当成列表值而报错；需要引用形参时用 table.put 运行时构造。

静态资源响应带 7 天强缓存（max-age=604800），改 client.mq.md 后需要 fetch(url, {cache:'reload'}) 强刷才能在浏览器看到新行为。
