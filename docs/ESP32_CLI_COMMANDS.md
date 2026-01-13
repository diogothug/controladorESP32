# 📟 ESP32 CLI - Referência de Comandos

Comandos seriais para teste e configuração do mostrador de marés.

**Formato:** `MODULO:NOME:AÇÃO[:PARAMS]`
**Resposta:** `OK:...` ou `ERR:...`

---

## 🔧 Sistema

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `SYS:HELLO` | Handshake inicial | `OK:ESP32:TIDE_DISPLAY:v3.1` |
| `SYS:INFO` | Info do dispositivo | `OK:SYS:FREE_MEM:xxx:UPTIME:xxx` |
| `SYS:REBOOT` | Reinicia o ESP32 | `OK:REBOOTING` |
| `SYS:STATE` | Estado atual do sistema | `OK:STATE:NORMAL` |
| `SYS:LOG` | Últimos eventos | `OK:LOG:[...]` |

---

## 🌊 Maré (TIDE)

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `TIDE:STATUS` | Estado atual | `OK:TIDE:LEVEL:85:DIR:RISING` |
| `TIDE:FETCH` | Força atualização da API | `OK:TIDE:FETCHING` |
| `TIDE:LEVEL:nn` | Define nível manual (0-100) | `OK:TIDE:LEVEL:nn` |
| `TIDE:DIR:RISING` | Define direção subindo | `OK:TIDE:DIR:RISING` |
| `TIDE:DIR:FALLING` | Define direção descendo | `OK:TIDE:DIR:FALLING` |
| `TIDE:COLOR:HIGH:#rrggbb` | Cor da maré alta | `OK:TIDE:COLOR:HIGH` |
| `TIDE:COLOR:LOW:#rrggbb` | Cor da maré baixa | `OK:TIDE:COLOR:LOW` |

---

## 💡 NeoPixel (LED)

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `NEO:name:ON` | Liga LEDs | `OK:NEO:name:ON` |
| `NEO:name:OFF` | Desliga LEDs | `OK:NEO:name:OFF` |
| `NEO:name:BRIGHT:nn` | Define brilho (0-255) | `OK:NEO:name:BRIGHT:nn` |
| `NEO:name:COLOR:#rrggbb` | Define cor fixa | `OK:NEO:name:COLOR` |
| `NEO:name:ANIM:RAINBOW` | Animação arco-íris | `OK:NEO:name:ANIM:RAINBOW` |
| `NEO:name:ANIM:FIRE` | Animação fogo | `OK:NEO:name:ANIM:FIRE` |
| `NEO:name:ANIM:AURORA` | Animação aurora | `OK:NEO:name:ANIM:AURORA` |
| `NEO:name:ANIM:NONE` | Sem animação | `OK:NEO:name:ANIM:NONE` |

---

## 🔆 Sensor LDR

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `LDR:name:READ` | Leitura atual ADC | `OK:LDR:name:2345` |
| `LDR:name:STATUS` | Estado completo | `OK:LDR:name:SMOOTH:xx:PENDING:xx:CURRENT:xx` |

---

## 📶 WiFi

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `WIFI:STATUS` | Estado conexão | `OK:WIFI:CONNECTED:SSID` |
| `WIFI:SCAN` | Escaneia redes | `OK:WIFI:SCAN:n` |
| `WIFI:CONNECT:ssid:pass` | Conecta à rede | `OK:WIFI:CONNECTING` |
| `WIFI:DISCONNECT` | Desconecta | `OK:WIFI:DISCONNECTED` |
| `WIFI:IP` | Endereço IP | `OK:WIFI:IP:192.168.x.x` |

---

## ⏰ Relógio (NTP)

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `TIME:GET` | Hora atual | `OK:TIME:HH:MM:SS` |
| `TIME:SYNC` | Força sync NTP | `OK:TIME:SYNCING` |
| `TIME:SOURCE` | Fonte do tempo | `OK:TIME:SOURCE:NTP` |

---

## 💾 Persistência (NVS)

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `NVS:GET:key` | Lê valor | `OK:NVS:key:value` |
| `NVS:SET:key:value` | Escreve valor | `OK:NVS:SET:key` |
| `NVS:DEL:key` | Remove chave | `OK:NVS:DEL:key` |
| `NVS:LIST` | Lista chaves | `OK:NVS:LIST:[...]` |

---

## 🔘 Botão

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `BTN:name:STATE` | Estado atual | `OK:BTN:name:0` ou `1` |

*Eventos gerados automaticamente:*
- `EVT:BTN:name:PRESS`
- `EVT:BTN:name:RELEASE`
- `EVT:BTN:name:HOLD`

---

## 🌡️ Temperatura

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `TEMP:name:READ` | Leitura temp | `OK:TEMP:name:25.5C` |
| `TEMP:name:HUM` | Leitura umidade | `OK:TEMP:name:HUM:65%` |

---

## 📈 Telemetria

| Comando | Descrição | Resposta |
|---------|-----------|----------|
| `TEL:STATUS` | Stats do sistema | `OK:TEL:UPTIME:xxx:REBOOTS:x` |
| `TEL:SAVE` | Força salvamento | `OK:TEL:SAVED` |

---

## ⚠️ Códigos de Erro

| Código | Significado |
|--------|-------------|
| `ERR:UNKNOWN_CMD` | Comando não reconhecido |
| `ERR:INVALID_PARAM` | Parâmetro inválido |
| `ERR:NOT_CONNECTED` | Sem conexão WiFi |
| `ERR:TIMEOUT` | Operação expirou |
| `ERR:NVS_FAIL` | Erro de persistência |

---

## 💡 Exemplos de Uso

```bash
# Handshake inicial
> SYS:HELLO
< OK:ESP32:TIDE_DISPLAY:v3.1

# Ver nível da maré
> TIDE:STATUS
< OK:TIDE:LEVEL:72:DIR:RISING

# Ajustar brilho
> NEO:MainStrip:BRIGHT:128
< OK:NEO:MainStrip:BRIGHT:128

# Ler sensor de luz
> LDR:Ambient:READ
< OK:LDR:Ambient:2847
```
