#include "./controller.h"
#include <Ps3Controller.h>

#define PS3_ADDR "2C:81:58:A1:A1:07"

constexpr uint8_t pwmB_1 = 14;
constexpr uint8_t pwmA_1 = 27;
constexpr uint8_t pwmB_2 = 26; 
constexpr uint8_t pwmA_2 = 25;

constexpr uint8_t pwmB_1_c = 15;
constexpr uint8_t pwmA_1_c = 14;
constexpr uint8_t pwmB_2_c = 13;
constexpr uint8_t pwmA_2_c = 12;

int16_t lx = 0;
int16_t ly = 0;
int16_t rx = 0;

uint8_t x = 0;

constexpr int PWM_FREQ = 10000;
constexpr int PWM_RES = 8;

void init_motor_ps(){
    Ps3.begin(PS3_ADDR);
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

void move_motor(int16_t lx, int16_t ly, int16_t rx){
    float normalize_lx = map(lx, -128, 127, -100, 100) / 100.0f;
    float normalize_ly = map(ly, -128, 127, -100, 100) / 100.0f;
    float normalize_rx = map(rx, -128, 127, -100, 100) / 100.0f;
    Serial.printf("norm lx: %0.2f | norm ly: %0.2f | norm rx: %0.2f\n", normalize_lx, normalize_ly, normalize_rx);
}

void update_data(int16_t &lx, int16_t &ly, int16_t &rx){
    lx = Ps3.data.analog.stick.lx;
    ly = Ps3.data.analog.stick.ly * -1;
    rx = Ps3.data.analog.stick.rx;

    x = Ps3.data.button.cross;
}