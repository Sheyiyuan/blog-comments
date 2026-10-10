---
title: "Dart 语法基础"
published: 2026-02-27 11:24
description: "Dart 是 Google 开发的现代化编程语言，Flutter 的主要语言。本文是个人学习笔记，梳理 Dart 的核心语法特性。"
image: ""
firstLineIndent: "0em"
tags: 
    - Dart
    - Flutter
category: "Flutter 学习笔记"
draft: false
pin: 0
lang: ""
comments: true
sponsor: true
---

简单过了一遍 dart 的语法，个人感觉 dart 的语法像是 go 里 go 气的 ts，不愧是谷歌的手笔；dart 代码使用严格分号结尾，这点与 go 刚好相反。

## 1\. 变量与常量

### 说明

- `var` 是类型推断，第一次赋值后类型就确定，不能再赋值为其他类型。
- 也可以显式写类型，如 `String name = "...";`，可读性更高。
- `const` 是编译期常量，值必须在编译阶段可确定。
- `final` 是运行期常量，可以在运行时初始化，但只能赋值一次。

```dart
// var：让编译器根据右侧值推断类型，这里推断为 int
var age = 20; // age 之后只能继续接收 int

// 显式声明：直接把类型写在前面，可读性更好
String name = "Sheyiyuan"; // name 的静态类型固定是 String

// const：编译期常量，值在编译阶段就确定
const double pi = 3.141592653589793;
const double root2 = 1.4142135623730951;

// final：运行时初始化一次，之后不可再赋值
final DateTime time = DateTime.now(); // 每次运行值可能不同
```

## 2\. 字符串 String

### 说明

- Dart 支持单引号和双引号，本文默认双引号。
- 字符串插值常用 `$var` 和 `${expression}`。
- 当拼接表达式或存在变量名歧义时，优先使用 `${}`。
- 字符串模板不是反引号语法，直接使用普通引号即可。

```dart
// 基本字符串声明
String text1 = "故障机器人";
String text2 = '坠机了';

// 字符串插值：变量可直接写 $变量名
// 复杂表达式建议用 ${表达式}
String text = "${text1}又$text2";

// 当变量名可能连续时，用空格或 ${} 避免歧义
int f = 1;
int fg = 2;
print("$f $fg"); // 输出: 1 2
```

## 3\. 数值类型：int / double / num

### 说明

- `int` 表示整数，`double` 表示浮点数，`num` 是二者共同父类型。
- 类型推断下，整数字面量通常推断为 `int`，小数字面量推断为 `double`。
- Dart 默认不做通用隐式转换，字符串与数字互转需要显式调用 API。
- `double` 可以赋值给 `num`；`num` 赋值给 `double` 需要显式转换。

```dart
// 明确声明不同数字类型
int a = 1;
double b = 1.1;
num c = 2; // num 可接收 int 或 double

// 查看运行时类型（调试时很有用）
print("a.runtimeType: ${a.runtimeType}, b.runtimeType: ${b.runtimeType}");

// 显式转换：int -> double
double d = a.toDouble();

// 显式转换：double -> int（会截断小数部分，不是四舍五入）
int e = b.toInt();

// 字符串转数字：解析失败会抛异常
int parsed = int.parse("123");

// 数字转字符串
String s = parsed.toString();
```

## 4\. 布尔类型 bool

### 说明

- 布尔值只有 `true` 和 `false`。
- Dart 不允许把非布尔值当作条件表达式。

```dart
bool isCompleted = false;
```

## 5\. 列表 List

### 说明

- `List<T>` 是有序集合，索引从 0 开始。
- 推荐写泛型（如 `List<String>`），避免 `dynamic` 扩散。
- `const` 列表是不可变列表，不能做增删改。
- 常用操作：`add`、`addAll`、`where`、`every`、`remove`、`removeAt`、`clear`。

```dart
// 声明一个元素类型为 String 的列表
final List<String> names = ["Alice", "Bromia"];

// add：在尾部追加一个元素
names.add("Cecelia");

// addAll：把另一个集合的元素依次追加到尾部
names.addAll(["Defect", "Defect"]);
print(names); // [Alice, Bromia, Cecelia, Defect, Defect]

// forEach：遍历每个元素并执行回调
names.forEach((element) {
  print(element);
});

// every：判断是否“所有元素都满足条件”
bool allDefect = names.every((element) => element == "Defect");

// where：筛选满足条件的元素，返回 Iterable
Iterable<String> defectNames = names.where((element) => element == "Defect");
print("All elements are Defect: $allDefect");
print("Defect names: ${defectNames.toList()}"); // toList 转回 List 便于打印

// 常见属性
print("Number of elements: ${names.length}"); // 长度
print("First element: ${names.first}"); // 首元素
print("Last element: ${names.last}"); // 尾元素
print("Is the list empty? ${names.isEmpty}"); // 是否为空

// 删除操作示例
names.remove("Defect"); // remove：删除第一个匹配项
names.removeLast(); // 删除最后一个元素
names.removeRange(0, 2); // 删除区间 [0, 2)，左闭右开
if (names.isNotEmpty) {
  names.removeAt(0); // 删除指定索引元素
}
print(names);
```

## 6\. 字典 Map&lt;K, V&gt;

### 说明

- `Map` 是键值对集合，键唯一、值可重复。
- 推荐总是声明泛型，提升可读性和类型安全。
- 常用操作：`map[key] = value`、`keys`、`values`、`length`、`remove`、`containsKey`、`containsValue`、`addAll`、`forEach`、`clear`。
- 字符串插值中访问键时常写成 `${map['name']}`，这里使用单引号可避免转义。

```dart
// 声明键和值都为 String 的 Map
final Map<String, String> typedInformMap = {
  "name": "Sheyiyuan",
  "age": "18",
};

// 通过索引语法新增或覆盖键值
typedInformMap["gender"] = "male";
typedInformMap["age"] = "20"; // 覆盖原 age
print(typedInformMap); // {name: Sheyiyuan, age: 20, gender: male}

// 读取与属性查看
print("Name: ${typedInformMap['name']}"); // 读取指定键
print("Keys: ${typedInformMap.keys}"); // 所有键
print("Values: ${typedInformMap.values}"); // 所有值
print("Number of key-value pairs: ${typedInformMap.length}"); // 键值对数量

// 删除与判断
typedInformMap.remove("age"); // 返回被删掉的值（若不存在则为 null）
print("Contains key \"name\"? ${typedInformMap.containsKey("name")}");
print("Contains value \"male\"? ${typedInformMap.containsValue("male")}");

// addAll：合并另一个 Map（同名键会被覆盖）
typedInformMap.addAll({
  "name": "社亦园",
  "hobby": "coding",
  "age": "20",
});

// forEach：遍历每一组 key-value
typedInformMap.forEach((key, value) {
  print("$key: $value");
});

// clear：清空 Map
typedInformMap.clear();
print(typedInformMap); // {}
```

## 7\. 动态类型 dynamic

### 说明

- `dynamic` 可以在运行时变更实际类型。
- 适合边界场景（如 JSON 反序列化过渡阶段），不建议滥用。
- 过多使用 `dynamic` 会削弱静态检查能力。

```dart
// dynamic 可在运行时持有任意类型
// 代价是编译期类型检查能力变弱
dynamic variable = "Hello, Dart";
print(variable); // Hello, Dart

// 同一个变量可改成 int
variable = 42;
print(variable); // 42

// 也可改成 List<int>
variable = [1, 2, 3];
print(variable); // [1, 2, 3]
```

## 8\. 空安全（Null Safety）

### 说明

- Dart 默认非空，变量默认不能为 `null`。
- 可空类型使用 `?`，如 `String?`。
- 安全访问使用 `?.`，空合并默认值使用 `??`。
- 非空断言 `!` 需谨慎，判断错了会触发运行时错误。

```dart
// String?：可空字符串，允许赋值 null
String? nullableString = "Hello, Dart";
print(nullableString); // Hello, Dart

nullableString = null;
print(nullableString); // null

// String：非空字符串，不能赋值 null
String nonNullableString = "Hello, Dart";
print(nonNullableString);

// ?.：当左侧为 null 时，整条表达式返回 null，不会抛异常
int? length = nullableString?.length;
print(length); // null

// ??: 左侧为 null 时使用右侧默认值
String defaultString = nullableString ?? "Default String";
print(defaultString); // Default String
```

## 9\. 运算符

### 说明

- 算术：`+`、`-`、`*`、`/`、`~/`（整除）、`%`。
- 赋值：`=`、`+=`、`-=`、`*=`、`/=`、`~/=`、`%=`。
- 比较：`==`、`!=`、`>`、`<`、`>=`、`<=`。
- 逻辑：`&&`、`||`、`!`，并且 `&&` / `||` 具备短路特性。

```dart
int a1 = 10;
int b1 = 3;

// 算术运算
print("a1 + b1 = ${a1 + b1}");
print("a1 - b1 = ${a1 - b1}");
print("a1 * b1 = ${a1 * b1}");
print("a1 / b1 = ${a1 / b1}"); // / 结果是 double
print("a1 ~/ b1 = ${a1 ~/ b1}"); // ~/ 是整除
print("a1 % b1 = ${a1 % b1}");

int c1 = 5;

// 复合赋值运算
c1 += 2;
c1 -= 3;
c1 *= 4;
c1 ~/= 5;
c1 %= 2;
print("c1 = $c1");

int d1 = 10;
int d2 = 20;

// 比较运算
print("d1 == d2: ${d1 == d2}");
print("d1 != d2: ${d1 != d2}");
print("d1 > d2: ${d1 > d2}");
print("d1 < d2: ${d1 < d2}");
print("d1 >= d2: ${d1 >= d2}");
print("d1 <= d2: ${d1 <= d2}");

bool e1 = true;
bool e2 = false;

// 逻辑运算（&& / || 支持短路）
print("e1 && e2: ${e1 && e2}");
print("e1 || e2: ${e1 || e2}");
print("!e1: ${!e1}");
```

## 10\. 流程控制

### 说明

- 条件语句：`if` / `else if` / `else`、`switch`。
- 循环语句：`for`、`while`、`do-while`。
- 三目表达式可在简单分支中替代 `if`。

```dart
int f1 = 10;

// if / else if / else 分支判断
if (f1 > 5) {
  print("f1 is greater than 5");
} else if (f1 == 5) {
  print("f1 is equal to 5");
} else {
  print("f1 is less than 5");
}

// 三目表达式：简洁地返回分支结果
String result = (f1 > 5) ? "Greater than 5" : "Not greater than 5";
print(result);

int g1 = 2;

// switch：适合离散值匹配
switch (g1) {
  case 1:
    print("g1 is 1");
    break; // 不加 break 会继续执行后续 case
  case 2:
    print("g1 is 2");
    break;
  case 3:
    print("g1 is 3");
    break;
  default:
    print("g1 is something else");
}

// for：已知循环次数时常用
for (int i = 0; i < 5; i++) {
  print("i: $i");
}

// while：先判断条件，再决定是否进入循环
int j = 0;
while (j < 5) {
  print("j: $j");
  j++;
}

// do-while：先执行一次，再判断条件
int k = 0;
do {
  print("k: $k");
  k++;
} while (k < 5);
```

## 11\. 函数

### 说明

- Dart 不支持传统函数重载。
- 可选参数分两类：可选位置参数 `[]`、可选命名参数 `{}`。
- 箭头函数适合单表达式返回。
- 闭包可以捕获外层函数变量。

```dart
// 普通函数：有函数名、参数和函数体
void greet(String name) {
  print("Hello, $name!");
}

greet("Cecelia");

// 可选位置参数：放在 [] 中，调用时可省略
void greetWithOptional(String name, [String? greeting]) {
  if (greeting != null) {
    print("$greeting, $name!");
  } else {
    print("Hello, $name!");
  }
}

greetWithOptional("Cecelia");
greetWithOptional("Cecelia", "Hi");

// 可选命名参数：放在 {} 中，调用时用 参数名:值
void greetWithNamed(String name, {String? sign, String? greeting}) {
  String actualGreeting = greeting ?? "Hello"; // 提供默认问候语
  String actualSign = sign ?? "!"; // 提供默认标点
  print("$actualGreeting, $name$actualSign");
}

greetWithNamed("Cecelia", sign: "?");
greetWithNamed("Cecelia", greeting: "Hi");

// 匿名函数：没有函数名，通常赋值给变量
var anonymousGreet = (String name) {
  print("Hello, $name!");
};
anonymousGreet("Cecelia");

// 箭头函数：只有一个表达式时可简写
String arrowGreet(String name) => "Hello, $name!";
print(arrowGreet("Cecelia"));

// 闭包：返回的函数可“记住”外层变量 addBy
Function makeAdder(int addBy) {
  return (int i) => addBy + i;
}

var add2 = makeAdder(2);
print(add2(3)); // 5
```

## 12\. 类

### 说明

- Dart 是纯面向对象语言，几乎所有值都是对象。
- 类由字段（属性）、方法、构造函数组成。
- 支持普通构造、命名构造、工厂构造、继承、抽象类、接口实现、静态成员。
- 私有成员通过“库私有”规则实现：以下划线 `_` 开头的成员仅在当前库可见。

```dart
// 一个基础类：演示字段、构造函数、实例方法、getter/setter
class Person {
  // 普通实例字段：每个对象各自拥有一份
  String name;
  int age;

  // 私有字段：以下划线开头，仅当前库可见
  String _id;

  // 主构造函数：this.name / this.age 是参数到字段的简写绑定
  Person(this.name, this.age, this._id);

  // 命名构造函数：更适合表达不同初始化语义
  Person.guest() : name = "Guest", age = 0, _id = "GUEST";

  // getter：对外暴露只读视图
  String get maskedId => "***${_id.substring(_id.length - 2)}";

  // setter：集中做数据校验
  set updateAge(int value) {
    if (value >= 0) {
      age = value;
    }
  }

  // 实例方法
  void introduce() {
    print("Hi, I am $name, age: $age, id: $maskedId");
  }
}

// 继承：Student 继承 Person 的字段与方法
class Student extends Person {
  // 新增子类字段
  String major;

  // super(...) 调用父类构造函数
  Student(String name, int age, String id, this.major) : super(name, age, id);

  // override：重写父类方法
  @override
  void introduce() {
    print("Hi, I am $name, major in $major, age: $age");
  }
}

// 抽象类：不能直接实例化，通常用于定义能力规范
abstract class Animal {
  void speak(); // 抽象方法：子类必须实现
}

// implements：按“接口契约”实现
class Dog implements Animal {
  @override
  void speak() {
    print("Woof!");
  }
}

// 静态成员：属于类本身，不属于实例
class MathHelper {
  static const double pi = 3.141592653589793;

  static double circleArea(double radius) {
    return pi * radius * radius;
  }
}

// 工厂构造函数：可返回缓存实例，或返回子类型实例
class Logger {
  final String name;

  // 私有命名构造：仅类内部可直接调用
  Logger._internal(this.name);

  // 缓存池（静态）
  static final Map<String, Logger> _cache = <String, Logger>{};

  // factory：可以不每次都 new 新对象
  factory Logger(String name) {
    return _cache.putIfAbsent(name, () => Logger._internal(name));
  }

  void log(String message) {
    print("[$name] $message");
  }
}

void main() {
  // 主构造
  Person p1 = Person("Sheyiyuan", 18, "ID2026");
  p1.introduce();

  // 命名构造
  Person guest = Person.guest();
  guest.introduce();

  // setter 校验
  p1.updateAge = 19;
  p1.introduce();

  // 继承与多态
  Person stu = Student("Cecelia", 20, "ST01", "Computer Science");
  stu.introduce(); // 实际调用 Student 的重写方法

  // 抽象类 + 接口实现
  Animal dog = Dog();
  dog.speak();

  // 静态成员访问方式：类名.成员
  print("Area: ${MathHelper.circleArea(2)}");

  // 工厂构造缓存验证
  Logger l1 = Logger("app");
  Logger l2 = Logger("app");
  print(identical(l1, l2)); // true，说明命中了缓存
  l1.log("Started");
}
```

## 13\. 抽象类与接口实现

### 说明

- 抽象类用 `abstract class` 声明，不能直接实例化。
- 抽象类可以同时包含：
    - 抽象成员（只有声明，没有实现）；
    - 已实现成员（子类可直接复用）。
- `extends` 表示继承实现：子类会复用父类已实现的逻辑。
- `implements` 表示按接口契约实现：必须重写接口中的所有成员（包括 getter/setter）。
- Dart 没有单独的 `interface` 关键字，任何类都可以被 `implements` 当作接口使用。

```dart
// 抽象类：定义“设备”这一抽象概念
abstract class Device {
  // 抽象 getter：子类必须提供具体返回值
  String get model;

  // 抽象方法：子类必须实现
  void start();

  // 已实现方法：子类可直接继承复用
  void shutdown() {
    print("$model is shutting down");
  }
}

// 普通类被当作“接口”使用（用于 implements）
class Chargeable {
  int batteryLevel = 0;

  void charge(int amount) {}
}

// 另一个可被实现的接口
class Connectable {
  bool get isConnected => false;

  void connect(String target) {}
}

// extends：继承 Device 已实现方法
// implements：必须完整实现 Chargeable / Connectable 的成员
class Phone extends Device implements Chargeable, Connectable {
  @override
  final String model;

  @override
  int batteryLevel;

  bool _connected = false;

  Phone(this.model, {this.batteryLevel = 20});

  @override
  void start() {
    print("$model is starting");
  }

  @override
  bool get isConnected => _connected;

  @override
  void connect(String target) {
    _connected = true;
    print("$model connected to $target");
  }

  @override
  void charge(int amount) {
    batteryLevel += amount;
    if (batteryLevel > 100) {
      batteryLevel = 100;
    }
    print("$model battery: $batteryLevel%");
  }
}

void main() {
  Phone phone = Phone("Pixel", batteryLevel: 35);

  // 来自抽象类约定的方法
  phone.start();

  // 来自接口契约的方法
  phone.connect("WiFi-Home");
  phone.charge(30);

  // 来自抽象类已实现的复用方法
  phone.shutdown();
}
```

## 14\. 类的混入（mixin）

### 说明

- `mixin` 用于“复用一组方法/字段实现”，避免多层继承导致结构僵硬。
- 使用方式：`class A with M1, M2`，可以一次混入多个 mixin。
- 冲突规则：如果多个 mixin 有同名方法，后写的 mixin 优先级更高。
- `on` 约束：限制该 mixin 只能用于某些父类体系。
- `mixin` 不是普通类，不能被 `new` 实例化；它是“能力片段”。

```dart
// 基础类：被混入目标类继承
class User {
  final String name;

  User(this.name);
}

// 普通 mixin：提供可复用能力
mixin LoggerMixin {
  void log(String message) {
    print("[LOG] $message");
  }
}

// 带状态的 mixin：可声明字段
mixin CounterMixin {
  int _count = 0;

  int get count => _count;

  void increase() {
    _count++;
  }
}

// 带 on 约束的 mixin：只能混入到 User 或其子类
mixin UserInfoMixin on User {
  String get displayName => "User<$name>";
}

// with：把多个 mixin 的能力拼装到同一个类里
class Admin extends User with LoggerMixin, CounterMixin, UserInfoMixin {
  Admin(super.name);

  void work() {
    increase(); // 来自 CounterMixin
    log("$displayName working, count=$count"); // Logger + UserInfo
  }
}

// 演示同名方法冲突：后面的 mixin 会覆盖前面的实现
mixin WalkMixin {
  void move() {
    print("walk");
  }
}

mixin RunMixin {
  void move() {
    print("run");
  }
}

class Athlete with WalkMixin, RunMixin {}

void main() {
  Admin admin = Admin("Sheyiyuan");
  admin.work();
  admin.work();

  Athlete athlete = Athlete();
  athlete.move(); // 输出 run（因为 RunMixin 写在后面）
}
```

### 补充

- `mixin`：只能被混入，不能直接 `new`。
- `class`：普通类，可实例化、可继承。
- `mixin class`（Dart 3）：既可以被实例化（像类），也可以被 `with` 混入（像 mixin）。

```dart
// Dart 3：mixin class 同时具备 class + mixin 的能力
mixin class Timestamped {
  final DateTime createdAt = DateTime.now();

  String createdLabel() => createdAt.toIso8601String();
}

class Task with Timestamped {
  final String title;
  Task(this.title);
}

void main() {
  Task t = Task("Write notes");
  print(t.createdLabel());

  // 也可直接实例化（这是 mixin class 与 mixin 的关键区别）
  Timestamped ts = Timestamped();
  print(ts.createdLabel());
}
```

- 实践建议：
    - 只复用行为，用 `mixin`；
    - 既要“可复用”又要“可单独实例化”，可考虑 `mixin class`；
    - 有明显 is-a 关系时优先 `extends`，不要滥用 mixin。
- 常见坑：
    - 多个 mixin 同名方法冲突时，后写覆盖前写；
    - `on` 约束不满足会直接编译报错；
    - mixin 中状态字段过多会提高耦合度，建议保持轻量。

### extends / implements / with 速记

| 关键字 | 核心含义 | 会继承实现吗 | 典型场景 | 注意点 |
| --- | --- | --- | --- | --- |
| `extends` | 继承父类（is-a） | 会   | 明确父子层级关系 | 单继承；子类可 `@override` |
| `implements` | 按接口契约实现 | 不会  | 只要能力约束，不要父类实现 | 必须实现所有成员 |
| `with` | 混入复用能力片段 | 会（来自 mixin） | 横切能力复用（日志、计数、缓存标记） | 多个 mixin 冲突时后者覆盖前者 |

## 15\. 泛型（Generics）

### 说明

- 泛型的核心价值：把“类型”参数化，提升复用性与类型安全。
- 常见写法：`List<String>`、`Map<String, int>`、`class Box<T>`、`T identity<T>(T value)`。
- 当类型不满足预期时，问题会在编译期暴露，而不是拖到运行时。
- 可以用 `extends` 给泛型参数加约束，如 `T extends num`。

```dart
// 1) 集合中的泛型：限制元素类型，避免 dynamic 扩散
List<String> names = ["Alice", "Bronia"];
// names.add(123); // 编译报错：int 不能放进 List<String>

Map<String, int> scoreMap = {
  "math": 95,
  "english": 88,
};
print(scoreMap["math"]);

// 2) 泛型函数：输入什么类型，就返回什么类型
T identity<T>(T value) {
  return value;
}

void testGenericFunction() {
  String s = identity<String>("hello");
  int n = identity<int>(100);

  // 大多数时候可省略类型参数，让编译器推断
  bool flag = identity(true);

  print("$s, $n, $flag");
}

// 3) 泛型类：把类型作为类的一部分
class Box<T> {
  T value;

  Box(this.value);

  T getValue() => value;

  void setValue(T newValue) {
    value = newValue;
  }
}

void testGenericClass() {
  Box<String> stringBox = Box<String>("Dart");
  print(stringBox.getValue());

  Box<int> intBox = Box<int>(42);
  intBox.setValue(100);
  print(intBox.getValue());
}

// 4) 泛型约束：限制 T 必须是 num 或其子类型
T addNum<T extends num>(T a, T b) {
  // num 的 + 返回 num，这里通过 as T 转回目标类型
  return (a + b) as T;
}

void testGenericConstraint() {
  int i = addNum<int>(1, 2);
  double d = addNum<double>(1.5, 2.5);
  print("$i, $d");

  // addNum<String>("1", "2");
  // 编译报错：String 不满足 T extends num
}

void main() {
  testGenericFunction();
  testGenericClass();
  testGenericConstraint();
}
```

### 泛型实践建议

- 集合一律写泛型：`List<T>` / `Map<K, V>`，不要偷懒写裸类型。
- 能用编译器推断就让其推断，但公开 API 建议显式写清类型参数。
- 写库代码时优先泛型 + 约束，减少 `dynamic` 与强转。
- 遇到类型推断不稳定时，手动补上 `<T>` 通常能快速解题。

### 常见坑

- 把 `List` 写成裸类型（不带 `<T>`）会回退到弱约束，容易埋雷。
- 泛型约束过弱会让 API 太宽泛，过强会影响复用，需平衡。
- 在泛型方法里滥用 `as` 强转可能引入运行时异常。

## 16\. 异步编程（Future）

### 说明

- Dart 采用事件循环模型：同步代码先执行，再处理微任务队列，最后处理事件队列。
- 耗时操作（网络请求、文件 IO、定时器）应使用异步 API，避免阻塞主线程。
- `Future<T>` 用于表示“未来某个时刻会得到一个 `T` 或抛出错误”的结果。
- 常见写法有两种：
    - `async/await`：可读性高，接近同步代码；
    - 链式调用：`then` / `catchError` / `whenComplete`。

### 事件循环

执行顺序可简化理解为：

同步代码 -> 微任务队列 -> 事件队列

- 微任务队列：`Future.microtask`、`scheduleMicrotask`。
- 事件队列：`Future(() {})`、`Future.delayed`、`Timer` 等。

```dart
import "dart:async";

void main() {
  print("A. sync start");

  scheduleMicrotask(() {
    print("B. microtask");
  });

  Future(() {
    print("C. event queue task");
  });

  print("D. sync end");
}

// 常见输出顺序：
// A. sync start
// D. sync end
// B. microtask
// C. event queue task
```

### Future 基础

```dart
// 模拟异步请求
Future<String> fetchData() async {
  await Future.delayed(Duration(seconds: 1));
  return "Data fetched";
}

// async/await 写法：推荐业务代码优先使用
Future<void> runWithAwait() async {
  print("[await] start");

  try {
    String result = await fetchData();
    print("[await] result: $result");
  } catch (e) {
    print("[await] error: $e");
  }
}
```

### 链式调用

```dart
Future<String> step1() async {
  await Future.delayed(Duration(milliseconds: 200));
  return "step1";
}

Future<String> step2(String input) async {
  await Future.delayed(Duration(milliseconds: 200));
  return "$input -> step2";
}

Future<void> runWithChain() async {
  step1()
      // then 可串联下一个 Future，形成链式流程
      .then((value) {
        print("chain value1: $value");
        return step2(value);
      })
      .then((value) {
        print("chain value2: $value");
      })
      // catchError 统一处理上游抛出的异常
      .catchError((error) {
        print("chain error: $error");
      })
      // whenComplete 无论成功或失败都会执行
      .whenComplete(() {
        print("chain finished");
      });
}
```

### Future 与 Promise 对比（Dart vs JavaScript）

| 维度  | Dart Future | JavaScript Promise |
| --- | --- | --- |
| 作用  | 表示未来结果（值或错误） | 表示未来结果（值或拒绝） |
| 主要链式 API | `then` / `catchError` / `whenComplete` | `then` / `catch` / `finally` |
| `async` 函数返回 | `Future<T>` | `Promise<T>` |
| 组合并发 | `Future.wait` / `Future.any` | `Promise.all` / `Promise.race` |
| 调度模型重点 | 微任务 + 事件队列（Event Loop） | 微任务队列 + 宏任务队列 |
| 错误处理习惯 | `try/catch` + `catchError` | `try/catch` + `.catch()` |

结论：

- 概念非常接近，可以把 `Future` 理解为 Dart 世界里的 `Promise`。
- API 命名略有差异：`whenComplete` 对应 JS 的 `finally`。
- 在 Dart 业务代码中通常优先使用 `async/await`，链式调用适合做流程拼装与中间步骤拦截。