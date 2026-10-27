#include <Arduino.h>
#include <Ps3Controller.h>
#include <Wire.h>
// #include "../lib/lib_hmc_magneto/magneto.h"

#define PS3_ADDR "2C:81:58:A1:A1:07"

float data_x = 0.0f;
float data_y = 0.0f;
float data_z = 0.0f;

volatile bool data_ready_flag = false;

float error = 0.0f;
float target = 0.0f;

constexpr uint8_t int_pin = 4;

void printBinary(int num) {
    for (int i = sizeof(int) * 8 - 1; i >= 0; i--) {
        Serial.printf("%d", (num >> i) & 1);
    }
    Serial.printf("\n");
}

constexpr uint8_t hmc5883l_addr_i2c = 0x1e; // use this
constexpr uint8_t hmc5883l_read_addr_i2c = 0x3d; // cuman aku list aja
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

enum class SAMPLE_AVG_CONF_A: uint8_t {
    MODE_1 = 0b00,  // sample 1 kali
    MODE_2 = 0b01,  // sample 2 kali
    MODE_3 = 0b10,  // sample 4 kali
    MODE_4 = 0b11   // sample 8 kali
};

enum class DOUT_RATE_CONF_A : uint8_t{
    HZ_0_75 =   static_cast<uint8_t>(0b000),        // 0.75 HZ
    HZ_1_5  =   static_cast<uint8_t>(0b001),         // 1.5 HZ
    HZ_3    =   static_cast<uint8_t>(0b010),           // 3 HZ
    HZ_7_5  =   static_cast<uint8_t>(0b011),         // 7.5 HZ
    HZ_15   =   static_cast<uint8_t>(0b100),          // 15 HZ
    HZ_30   =   static_cast<uint8_t>(0b101),          // 30 HZ
    HZ_75   =   static_cast<uint8_t>(0b110)           // 75 HZ
};

enum class MEASUREMENT_MODE_CONF_A : uint8_t{
    MODE_1  =   static_cast<uint8_t>(0b00),    //  DEFAULT
    MODE_2  =   static_cast<uint8_t>(0b01),       
    MODE_3  =   static_cast<uint8_t>(0b10)      
};

enum class SENSITIVITY_MODE_CONF_B : uint8_t {
    MODE_1  =   static_cast<uint8_t>(0b000),    // ± 0.88 Ga LSB = 1370 
    MODE_2  =   static_cast<uint8_t>(0b001),    // ± 1.3 Ga LSB = 1090  DEFAULT
    MODE_3  =   static_cast<uint8_t>(0b010),    // ± 1.9 Ga LSB = 820
    MODE_4  =   static_cast<uint8_t>(0b011),    // ± 2.5 Ga LSB = 660
    MODE_5  =   static_cast<uint8_t>(0b100),    // ± 4.0 Ga LSB = 440 
    MODE_6  =   static_cast<uint8_t>(0b101),    // ± 4.7 Ga LSB = 390
    MODE_7  =   static_cast<uint8_t>(0b110),    // ± 5.6 Ga LSB = 330
    MODE_8  =   static_cast<uint8_t>(0b111)     // ± 8.1 Ga LSB = 230
};

enum class MODE_REG_SELECT : uint8_t {
    MODE_1 = static_cast<uint8_t>(0b00),
    MODE_2 = static_cast<uint8_t>(0b01),
    MODE_3 = static_cast<uint8_t>(0b10),
    MODE_4 = static_cast<uint8_t>(0b11)
};

uint8_t setup_device(){
    Wire.beginTransmission(hmc5883l_addr_i2c);
    Wire.write(CONF_REG_A); // access config register A
    uint8_t to_write_byte = 0b00000000 | ( static_cast<uint8_t>(MEASUREMENT_MODE_CONF_A::MODE_1) | ( static_cast<uint8_t>(DOUT_RATE_CONF_A::HZ_15) << 2 ) | ( static_cast<uint8_t>(SAMPLE_AVG_CONF_A::MODE_4) ) << 5 );
    Wire.write(to_write_byte);
    uint8_t status_write = Wire.endTransmission();

    if( status_write != 0 ) return status_write;

    Wire.beginTransmission(hmc5883l_addr_i2c);
    Wire.write(CONF_REG_B); // access config register B
    to_write_byte = 0b00000000 | ( static_cast<uint8_t>(SENSITIVITY_MODE_CONF_B::MODE_4) << 5 );
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

void update_data_magneto(float &mag_x, float &mag_y, float &mag_z){
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

        mag_x = static_cast<float>(raw_x) / 660.0f;    // data jadi
        mag_y = static_cast<float>(raw_y) / 660.0f;
        mag_z = static_cast<float>(raw_z) / 660.0f;
    }

    else return;
}

void IRAM_ATTR set_flag_update(){
    data_ready_flag = true;
}

float bias_factor[3] = {0.219225f, -1.568200f, 0.566352f};

float yaw_deg = 0.0f;

constexpr uint8_t pwmB_1 = 14;
constexpr uint8_t pwmA_1 = 27;
constexpr uint8_t pwmB_2 = 26; 
constexpr uint8_t pwmA_2 = 25;

constexpr uint8_t pwmB_1_c = 15;
constexpr uint8_t pwmA_1_c = 14;
constexpr uint8_t pwmB_2_c = 13;
constexpr uint8_t pwmA_2_c = 12;


constexpr int PWM_FREQ = 10000;
constexpr int PWM_RES = 8;

void setup(){
    Serial.begin(115200);
    Ps3.begin(PS3_ADDR);
    pinMode(int_pin, INPUT);
    attachInterrupt(digitalPinToInterrupt(int_pin), set_flag_update, RISING);
    Wire.begin();
    setup_device();
    delay(1000);


    ledcSetup(pwmB_1_c, PWM_FREQ, PWM_RES);
    ledcSetup(pwmA_1_c, PWM_FREQ, PWM_RES);
    ledcSetup(pwmB_2_c, PWM_FREQ, PWM_RES);
    ledcSetup(pwmA_2_c, PWM_FREQ, PWM_RES);

    ledcAttachPin(pwmB_1, pwmB_1_c);
    ledcAttachPin(pwmA_1, pwmA_1_c);
    ledcAttachPin(pwmB_2, pwmB_2_c);
    ledcAttachPin(pwmA_2, pwmA_2_c);

    ledcWrite(pwmB_1_c, 0);
    ledcWrite(pwmA_1_c, 0);
    ledcWrite(pwmB_2_c, 0);
    ledcWrite(pwmA_2_c, 0);
}

void loop(){
    uint8_t cross = Ps3.data.button.cross;
    uint8_t circle = Ps3.data.button.circle;
    uint8_t square = Ps3.data.button.square;
    uint8_t triangle = Ps3.data.button.triangle;

    if(cross){
        target = 0.0f;
    }

    else if(circle){
        target = 90.0f;
    }

    else if(triangle){
        target = 180.0f;
    }

    else if(square){
        target = 270.0f;
    }

    if(data_ready_flag){
        data_ready_flag = false;
        update_data_magneto(data_x, data_y, data_z);
        // Serial.printf("mag_x: %0.2f     mag_y: %0.2f    mag_z: %0.2f\n", data_x, data_y, data_z);
        // Serial.printf("%0.2f %0.2f %0.2f\n", data_x, data_y, data_z);
        float bias_x = data_x - bias_factor[0];
        float bias_y = data_y - bias_factor[1];
        float bias_z = data_z - bias_factor[2];
        
        float cal_x = (2.137135f * bias_x) + (-0.008986f * bias_y) + (-0.025793f * bias_z);
        float cal_y = (-0.008986f * bias_x) + (1.949778f * bias_y) + (0.014036f * bias_z);
        float cal_z = (-0.025793f * bias_x) + (0.014036f * bias_y) + (2.397896f * bias_z);

        // Serial.printf("mag_x: %0.2f     mag_y: %0.2f    mag_z: %0.2f\n", cal_x, cal_y, cal_z);

        float yaw = atan2f(cal_y, cal_x);
        yaw_deg = yaw * RAD_TO_DEG;

        if (yaw_deg < 0) {
            yaw_deg += 360.0f;
        }

        Serial.printf("yaw: %0.2f | target: %0.2f\n", yaw_deg, target);
    }

    float error_now = target - yaw_deg;
    if (error_now > 180.0f)  error_now -= 360.0f;
    if (error_now < -180.0f) error_now += 360.0f;

    if( fabs(error_now) <= 15 ){
        ledcWrite(pwmB_1_c, 0);
        ledcWrite(pwmA_1_c, 0);
        ledcWrite(pwmB_2_c, 0);
        ledcWrite(pwmA_2_c, 0);
    }

    else if( target < yaw_deg ){
        ledcWrite(pwmB_1_c, 0);
        ledcWrite(pwmA_1_c, 127);
        ledcWrite(pwmB_2_c, 127);
        ledcWrite(pwmA_2_c, 0);
    }

    else if( target > yaw_deg ){
        ledcWrite(pwmB_1_c, 127);
        ledcWrite(pwmA_1_c, 0);
        ledcWrite(pwmB_2_c, 0);
        ledcWrite(pwmA_2_c, 127);
    }

}