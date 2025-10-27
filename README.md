adb -s 127.0.0.1:5555 reverse tcp:3000 tcp:3000

adb -s 127.0.0.1:5555 reverse tcp:3001 tcp:3001

adb -s emulator-5556 reverse tcp:3000 tcp:3000 

adb -s emulator-5556 reverse tcp:3001 tcp:3001 

adb -s 127.0.0.1:5555 shell

npm install json-bigint

npx pbjs --es6 proto_gen/packet.js proto/packet.proto

readVarint64函数返回值修改为：
```javascript
part0 = BigInt(part0);
part1 = BigInt(part1);
part2 = BigInt(part2);
const low = part0 | (part1 << 28n);
const high = (part1 >> 4n) | (part2 << 24n);
return (high << 32n) | low;
```

TODO:
- 新私聊未在消息tab显示