---
title: "Linux regmap：把寄存器和物理总线解耦"
description: "为什么内核喜欢 regmap？从 SPI/I2C 驱动差异理解抽象层价值。"
date: 2026-09-01
tags: ["Linux", "驱动", "regmap", "SPI"]
lang: "zh-CN"
draft: false
---

写 Linux 驱动时，同样一份寄存器读写逻辑经常要在 SPI 和 I2C 之间复制。`regmap` 提供的是“寄存器语义”的统一接口：驱动关心寄存器编号与位域，底层的总线事务交给 regmap 完成。

## 传统写法的问题

```c
/* SPI 版 */
static int chip_read_reg(struct spi_device *spi, u8 reg, u8 *val) {
    u8 tx[2] = { reg, 0 };
    return spi_write_then_read(spi, tx, 1, val, 1);
}
/* I2C 版 */
static int chip_read_reg(struct i2c_client *client, u8 reg, u8 *val) {
    return i2c_smbus_read_byte_data(client, reg);
}
```

业务代码如果直接调用上面两个函数，切换总线时就要改调用点。

## regmap 统一视角

```c
static const struct regmap_config cfg = {
    .reg_bits = 8,
    .val_bits = 8,
    .max_register = 0xff,
};

regmap = devm_regmap_init_spi(spi, &cfg);
// 或 regmap = devm_regmap_init_i2c(client, &cfg);

regmap_read(regmap, 0x10, &value);
regmap_update_bits(regmap, 0x10, 0x0f, 0x03);
```

驱动剩下的代码与总线类型无关：寄存器 map、读写缓存、并发锁、位域更新都收敛到 regmap。

## 值得记住的收益

- **并发安全**：`regmap` 内置 lock，多线程访问不会裸奔；
- **调试友好**：打开动态调试可观察每次总线事务；
- **缓存与脏位**：`regmap_cache` 能显著减少无谓总线读；
- **可测**：测试代码可以替换 regmap bus 做软件仿真。

这个模式对理解“抽象层边界在哪里”很有帮助：当一种资源的访问方式存在多种物理实现、且业务逻辑与实现无关时，就值得抽层。
