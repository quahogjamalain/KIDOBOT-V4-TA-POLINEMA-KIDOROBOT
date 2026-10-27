#pragma once
#include <Arduino.h>
#include <Wire.h>

namespace HMC5883L{
constexpr uint8_t hmc5883l_addr_i2c = 0x1e; // use this
constexpr uint8_t hmc5883l_read_addr_i2c = 0x3d;
constexpr uint8_t hmc5883l_write_addr_i2c = 0x3c;

// register map list
constexpr uint8_t CONF_REG_A = 0x00;
constexpr uint8_t CONF_REG_B = 0x01;
constexpr uint8_t MODE_REG = 0x02;
constexpr uint8_t DOUT_X_MSB_REG = 0x03;
constexpr uint8_t DOUT_X_LSB_REG = 0x04;
constexpr uint8_t DOUT_Y_MSB_REG = 0x05;
constexpr uint8_t DOUT_Y_LSB_REG = 0x06;
constexpr uint8_t DOUT_Z_MSB_REG = 0x07;
constexpr uint8_t DOUT_Z_LSB_REG = 0x08;
constexpr uint8_t STATUS_REG = 0x09;
constexpr uint8_t ID_REG_A = 0x0a;
constexpr uint8_t ID_REG_B = 0x0b;
constexpr uint8_t ID_REG_C = 0x0c;


/**
 * @brief enum class buat ngatur berapa kali sample dalam 1 output
 * 
 * enum ini dipakai di fungsi setup_device di parameter REG_2
 */
enum class SAMPLE_AVG_CONF_A: uint8_t {
    MODE_1 = 0b00,  ///< sample 1 kali
    MODE_2 = 0b01,  ///< sample 2 kali
    MODE_3 = 0b10,  ///< sample 4 kali
    MODE_4 = 0b11   ///< sample 8 kali
};


/**
 * @brief enum class buat ngatur data rate output sensor
 * 
 * enum ini dipakai di fungsi setup_device di parameter REG_3
 */
enum class DOUT_RATE_CONF_A : uint8_t{
    HZ_0_75 =   static_cast<uint8_t>(0b000),        ///< 0.75 HZ
    HZ_1_5  =   static_cast<uint8_t>(0b001),        ///< 1.5 HZ
    HZ_3    =   static_cast<uint8_t>(0b010),        ///< 3 HZ
    HZ_7_5  =   static_cast<uint8_t>(0b011),        ///< 7.5 HZ
    HZ_15   =   static_cast<uint8_t>(0b100),        ///< 15 HZ
    HZ_30   =   static_cast<uint8_t>(0b101),        ///< 30 HZ
    HZ_75   =   static_cast<uint8_t>(0b110)         ///< 75 HZ
};

enum class MEASUREMENT_MODE_CONF_A : uint8_t{
    MODE_1  =   static_cast<uint8_t>(0b00),    //  DEFAULT
    MODE_2  =   static_cast<uint8_t>(0b01),       
    MODE_3  =   static_cast<uint8_t>(0b10)      
};


/**
 * @brief enum class buat milih seberapa peka sensor merespon medan magnet
 * 
 * enum ini dipakai di fungsi setup_device di parameter REG_4
 */
enum class SENSITIVITY_MODE_CONF_B : uint8_t {
    MODE_1  =   static_cast<uint8_t>(0b000),    ///< ± 0.88 Ga LSB = 1370 
    MODE_2  =   static_cast<uint8_t>(0b001),    ///< ± 1.3 Ga LSB = 1090  DEFAULT
    MODE_3  =   static_cast<uint8_t>(0b010),    ///< ± 1.9 Ga LSB = 820
    MODE_4  =   static_cast<uint8_t>(0b011),    ///< ± 2.5 Ga LSB = 660
    MODE_5  =   static_cast<uint8_t>(0b100),    ///< ± 4.0 Ga LSB = 440 
    MODE_6  =   static_cast<uint8_t>(0b101),    ///< ± 4.7 Ga LSB = 390
    MODE_7  =   static_cast<uint8_t>(0b110),    ///< ± 5.6 Ga LSB = 330
    MODE_8  =   static_cast<uint8_t>(0b111)     ///< ± 8.1 Ga LSB = 230
};

enum class MODE_REG_SELECT : uint8_t {
    MODE_1 = static_cast<uint8_t>(0b00),
    MODE_2 = static_cast<uint8_t>(0b01),
    MODE_3 = static_cast<uint8_t>(0b10),
    MODE_4 = static_cast<uint8_t>(0b11)
};

/**
 * @brief Fungsi setup register HMC5883l, must be done first
 * 
 * Fungsi ini mengatur measurement mode (REG_1), rate data out (dalam hz) (REG_2),
 * sample average (REG_3), sensitivity mode (REG_4), pin interrupt, dan fungsi yang dijalankan
 * ketika interrupt aktif
 * 
 * @param REG_1             mengatur measurement mode (baca datasheet)
 * @param REG_2             mengatur laju data keluar dalam satu detik (hz)
 * @param REG_3             mengatur sample average, nanti dirata - rata secara internal
 * @param REG_4             mengatur kepekaaan sensor terhadadap gaya magnet di sekitar
 * @param intr_pin_esp      pin interrupt yang terhubung dengan HMC5883l
 * @param set_flag_update   function pointer buat dijalanin interrupt 
 */
uint8_t setup_device(MEASUREMENT_MODE_CONF_A REG_1 = MEASUREMENT_MODE_CONF_A::MODE_1,\
                     DOUT_RATE_CONF_A REG_2 = DOUT_RATE_CONF_A::HZ_15, \
                     SAMPLE_AVG_CONF_A REG_3 = SAMPLE_AVG_CONF_A::MODE_4, \
                     SENSITIVITY_MODE_CONF_B REG_4 = SENSITIVITY_MODE_CONF_B::MODE_4, \
                     uint8_t intr_pin_esp = 4, \
                     void (*set_flag_update)() = nullptr);

void update_data_magneto(float &mag_x, float &mag_y, float &mag_z, SENSITIVITY_MODE_CONF_B DIVIDER = SENSITIVITY_MODE_CONF_B::MODE_4);

}