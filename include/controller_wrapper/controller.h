#pragma once
#include <Arduino.h>


void init_motor_ps();
void update_data(int16_t &lx, int16_t &ly, int16_t &rx);
void move_motor(int16_t lx, int16_t ly, int16_t rx);