#include "./magneto.h"

namespace HMC5883L{
uint8_t setup_device(MEASUREMENT_MODE_CONF_A REG_1, DOUT_RATE_CONF_A REG_2, SAMPLE_AVG_CONF_A REG_3, SENSITIVITY_MODE_CONF_B REG_4, uint8_t intr_pin_esp, void (*set_flag_update)()){
    pinMode(intr_pin_esp, INPUT);

    if(set_flag_update != nullptr) attachInterrupt(digitalPinToInterrupt(intr_pin_esp), set_flag_update, RISING);

    Wire.beginTransmission(hmc5883l_addr_i2c);
    Wire.write(CONF_REG_A); // access config register A
    uint8_t to_write_byte = 0b00000000 | ( static_cast<uint8_t>(REG_1) | ( static_cast<uint8_t>(REG_2) << 2 ) | ( static_cast<uint8_t>(REG_3) ) << 5 );
    Wire.write(to_write_byte);
    uint8_t status_write = Wire.endTransmission();

    if( status_write != 0 ) return status_write;

    Wire.beginTransmission(hmc5883l_addr_i2c);
    Wire.write(CONF_REG_B); // access config register B
    to_write_byte = 0b00000000 | ( static_cast<uint8_t>(REG_4) << 5 );
    Wire.write(to_write_byte);
    status_write = Wire.endTransmission();

    if( status_write != 0 ) return status_write;

    Wire.beginTransmission(hmc5883l_addr_i2c);
    Wire.write(MODE_REG); // Alamat 0x02
    Wire.write(0x00); 
    status_write = Wire.endTransmission();

    if (status_write != 0) return status_write;
    // printBinary(to_write_byte);

    return 0;
}

void update_data_magneto(float &mag_x, float &mag_y, float &mag_z, SENSITIVITY_MODE_CONF_B DIVIDER){
    Wire.beginTransmission(hmc5883l_addr_i2c);
    Wire.write(DOUT_X_MSB_REG);
    Wire.endTransmission(false);
    Wire.requestFrom(static_cast<int>(hmc5883l_addr_i2c), 6);

    if( Wire.available() >= 6 ) {
        uint8_t x_MSB = Wire.read(); // bit mentah
        uint8_t x_LSB = Wire.read();
        uint8_t z_MSB = Wire.read();
        uint8_t z_LSB = Wire.read();
        uint8_t y_MSB = Wire.read();
        uint8_t y_LSB = Wire.read();

        int16_t raw_x = static_cast<int16_t>((x_MSB << 8) | x_LSB);
        int16_t raw_y = static_cast<int16_t>((y_MSB << 8) | y_LSB);
        int16_t raw_z = static_cast<int16_t>((z_MSB << 8) | z_LSB);

        float data_div = 0.0f;

        switch(static_cast<uint8_t>(DIVIDER)){
            case 0:
                data_div = 1370.0f;
                break;
            case 1:
                data_div = 1090.0f;
                break;
            case 2:
                data_div = 820.0f;
                break;
            case 3:
                data_div = 660.0f;
                break;
            case 4:
                data_div = 440.0f;
                break;
            case 5:
                data_div = 390.0f;
                break;
            case 6:
                data_div = 330.0f;
                break;
            case 7:
                data_div = 230.0f;
                break;
        }

        mag_x = static_cast<float>(raw_x) / data_div;    // data jadi
        mag_y = static_cast<float>(raw_y) / data_div;
        mag_z = static_cast<float>(raw_z) / data_div;
    }

    else return;
}

}