#include <Arduino.h>
#include "Ps3Controller.h"

#define PS3_ADDR "2C:81:58:A1:A1:07"

int8_t current_pointer_index = 0;

enum class motor_command : uint8_t {
    FORWARD,
    BACKWARD,
    ROTATE_LEFT,
    ROTATE_RIGHT,
    STOP
};

struct command_run {
    int8_t index;
    motor_command to_move;
    bool SET_FLASH;
};

command_run list_running[8];

void init_command(command_run *to_init = nullptr, size_t array_size = 8){
    if(to_init != nullptr){
        for(uint8_t i = 0; i < array_size; i++){
            to_init[i] = {
                .index = i,
                .to_move = motor_command::STOP,
                .SET_FLASH = false
            };
        }
    }
    else return;
}

void show_running(command_run *to_show = nullptr, size_t array_size = 8){
    if(to_show != nullptr){
        for(uint8_t i = 0; i < array_size; i++){
            Serial.printf("command ke- %d\n", to_show[i].index);
            Serial.printf("perintah: %d\n", to_show[i].to_move);
            Serial.printf("flash_state: %d\n", to_show[i].SET_FLASH);
            Serial.println("========================================");
        }
    }
}

void setup(){
    Serial.begin(115200);
    init_command(list_running, 8);
    show_running(list_running, 8);
}

void loop(){

}