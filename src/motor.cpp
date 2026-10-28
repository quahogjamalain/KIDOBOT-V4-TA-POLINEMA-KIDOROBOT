#include <Arduino.h>

constexpr uint8_t mot_1a = 26;
constexpr uint8_t mot_1b = 27;
constexpr uint8_t mot_2a = 32;
constexpr uint8_t mot_2b = 33;

constexpr uint8_t mot_1a_c = 15;
constexpr uint8_t mot_1b_c = 14;
constexpr uint8_t mot_2a_c = 13;
constexpr uint8_t mot_2b_c = 12;

const uint8_t motor_pin[4] = {mot_1a, mot_1b, mot_2a, mot_2b};
const uint8_t motor_channel[4] = {mot_1a_c, mot_1b_c, mot_2a_c, mot_2b_c};

constexpr int pwm_freq = 10000;
constexpr int pwm_res = 8;


void init_motor(uint8_t *pin_cfg, uint8_t *channel_cfg){
    for(uint8_t i = 0; i < 4; i++){
        ledcSetup(channel_cfg[i], pwm_freq, pwm_res);
        ledcAttachPin(pin_cfg[i], channel_cfg[i]);
    }
}

void setup(){
    Serial.begin(115200);
}

void loop(){

}