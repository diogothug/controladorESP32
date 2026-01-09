# Serial Control App

Aplicativo Windows para controlar Arduino UNO e ESP32 via USB Serial.

## 🏗️ Arquitetura

```
serial-control-app/
├── app/                          # Electron Desktop App
│   ├── src/
│   │   ├── main/
│   │   │   ├── main.ts           # Entry point Electron
│   │   │   ├── serial-manager.ts # Único ponto de acesso serial
│   │   │   └── ipc-handlers.ts   # Comunicação main ↔ renderer
│   │   ├── preload/
│   │   │   └── preload.ts        # contextBridge (segurança)
│   │   └── renderer/
│   │       ├── index.html        # UI
│   │       ├── renderer.ts       # Lógica UI
│   │       └── styles.css        # Dark theme
│   ├── package.json
│   └── tsconfig.json
│
└── firmware/
    ├── arduino/uno_controller/   # C++ (Arduino Core)
    └── esp32/                    # MicroPython
```

## 🔌 Protocolo de Comunicação

```
Formato: <COMANDO>:<PARÂMETROS>
Handshake: SYS:HELLO
```

### Respostas

| Dispositivo | Resposta ao SYS:HELLO |
|-------------|----------------------|
| Arduino UNO | `OK:DEVICE=ARDUINO_UNO;FW=1.0.0;CAPS=GPIO,ADC,PWM` |
| ESP32 | `OK:DEVICE=ESP32;FW=1.0.0;CAPS=WIFI,SERIAL` |

## 🚀 Setup do App Electron

### Pré-requisitos

- **Node.js** v18+ ([Download](https://nodejs.org/))

### Instalação

```powershell
cd app
npm install
```

### Executar

```powershell
npm start
```

### Build de Produção

```powershell
npm run build
```

## 📟 Firmware

### Arduino UNO

1. Abra `firmware/arduino/uno_controller/uno_controller.ino` na Arduino IDE
2. Selecione a placa "Arduino UNO"
3. Upload

### ESP32 (MicroPython)

1. Flash MicroPython no ESP32
2. Copie todos os arquivos `.py` de `firmware/esp32/` para o dispositivo
3. Reinicie o ESP32

## ✅ Checklist de Verificação

```
[ ] npm install - sem erros
[ ] npm start - janela abre
[ ] UI em PT-BR
[ ] Lista portas COM
[ ] Conecta ao dispositivo
[ ] Handshake OK
[ ] Identifica device (Arduino/ESP32)
[ ] Envia comandos
[ ] Recebe respostas
```

## 📋 Estados de Conexão

| Estado | Descrição |
|--------|-----------|
| `DISCONNECTED` | Sem conexão |
| `CONNECTING` | Handshake em andamento |
| `CONNECTED` | Dispositivo identificado |
| `ERROR` | Falha de comunicação |

## ⏱️ Timeouts

- **Handshake**: 2000ms
- **Comando normal**: 500ms
