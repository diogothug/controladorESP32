#include "modules/web_server.h"
#include "config.h"
#include "modules/tide_engine.h"
#include "modules/wifi_manager.h"
#include "sys/boot.h"
#include "sys/state.h"
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <SPIFFS.h>

namespace Modules {

WebServer WebServerModule::server(80);
DNSServer WebServerModule::dnsServer;

// Minimal Dashboard HTML (Gzip candidate later)
const char *DASHBOARD_HTML = R"rawliteral(
<!DOCTYPE html><html><head><title>TideDisplay</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{background:#111;color:#eee;font-family:sans-serif;text-align:center;padding:20px}
.card{background:#222;border:1px solid #444;border-radius:10px;padding:20px;margin:10px auto;max-width:400px}
h1{color:#0af}button{background:#0af;border:none;padding:10px 20px;border-radius:5px;color:#fff;font-size:16px;cursor:pointer}
input{padding:10px;width:80%;margin:10px 0;background:#333;border:1px solid #555;color:#fff}</style>
<script>
function fetchStatus(){fetch('/api/status').then(r=>r.json()).then(d=>{
document.getElementById('mode').innerText=d.mode;
document.getElementById('tide').innerText=d.tide_level+'%';
})}
function saveWifi(){
 let ssid=document.getElementById('ssid').value;
 let pass=document.getElementById('pass').value;
 fetch('/api/config',{method:'POST',body:JSON.stringify({wifi:{ssid,pass}})}).then(r=>alert('Saved. Rebooting...'));
}
let clicks=0;
let timer=null;
function unlockManufacturer(){
 clicks++;
 if(timer) clearTimeout(timer);
 timer=setTimeout(()=>{clicks=0}, 2000);
 if(clicks>=5){
  document.getElementById('mfg_section').style.display='block';
  alert('Manufacturer Mode Unlocked!');
  clicks=0;
 }
}
setInterval(fetchStatus, 3000);
window.onload=fetchStatus;
</script></head>
<body>
<h1 onclick="unlockManufacturer()">TideDisplay Pro</h1>
<div class="card">
 <h3>Status</h3>
 <p>Mode: <span id="mode">Loading...</span></p>
 <p>Tide: <span id="tide">--</span></p>
</div>
<div class="card" id="mfg_section" style="display:none;border-color:#f00">
 <h3 style="color:#f00">Manufacturer</h3>
 <button onclick="fetch('/api/config',{method:'POST',body:JSON.stringify({reset_crash:true})})">Reset Crash Count</button>
 <button onclick="fetch('/api/config',{method:'POST',body:JSON.stringify({safe_mode:true})})">Force Safe Mode</button>
</div>
<div class="card">
 <h3>WiFi Setup</h3>
 <input id="ssid" placeholder="SSID"><br>
 <input id="pass" type="password" placeholder="Password"><br>
 <button onclick="saveWifi()">Save & Connect</button>
</div>
<div class="card">
 <h3>Support & Feedback</h3>
 <p>Contact: <a href="https://wa.me/5521988643166" style="color:#0af">+55 21 98864 3166</a></p>
 <input id="fb_name" placeholder="Name"><br>
 <input id="fb_msg" placeholder="Message"><br>
 <button onclick="sendFeedback()">Send Feedback</button>
</div>
<script>
function sendFeedback(){
 let n=document.getElementById('fb_name').value;
 let m=document.getElementById('fb_msg').value;
 fetch('/api/feedback',{method:'POST',body:JSON.stringify({name:n,msg:m})})
 .then(r=>alert('Feedback sent! Thanks.'));
}
</script>
</body></html>
)rawliteral";

void WebServerModule::init() {
  // Start DNS Server for Captive Portal (redirect all to this IP)
  dnsServer.start(53, "*", WiFi.softAPIP());

  setupRoutes();
  server.begin();
  Serial.println("[WEB] Server Started on port 80");
}

void WebServerModule::update() {
  dnsServer.processNextRequest();
  server.handleClient();
}

void WebServerModule::setupRoutes() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/generate_204", HTTP_GET, handleRoot); // Android Captive Portal
  server.on("/hotspot-detect.html", HTTP_GET, handleRoot); // iOS Captive Portal

  server.on("/api/status", HTTP_GET, handleApiStatus);
  server.on("/api/tide", HTTP_GET, handleApiTide);
  server.on("/api/config", HTTP_POST, handleApiConfig);
  server.on("/api/feedback", HTTP_POST, handleApiFeedback);

  server.onNotFound(handleNotFound);
}

void WebServerModule::handleRoot() {
  if (isCaptivePortal()) {
    // Redirect to root if specific captive portal URL requested
    if (server.uri() != "/") {
      server.sendHeader(
          "Location", String("http://") + server.client().localIP().toString(),
          true);
      server.send(302, "text/plain", "");
      return;
    }
  }
  server.send(200, "text/html", DASHBOARD_HTML);
}

void WebServerModule::handleNotFound() {
  if (isCaptivePortal()) {
    server.sendHeader("Location",
                      String("http://") + server.client().localIP().toString(),
                      true);
    server.send(302, "text/plain", "");
  } else {
    server.send(404, "text/plain", "Not Found");
  }
}

void WebServerModule::handleApiStatus() {
  StaticJsonDocument<256> doc;
  doc["fw"] = FIRMWARE_VERSION;
  doc["uptime"] = millis() / 1000;
  doc["mode"] = (Sys::checkBoot()) ? "NORMAL" : "SAFE";
  doc["tide_level"] = (int)(Modules::TideEngine::getTideLevel() * 100);
  doc["rising"] = Modules::TideEngine::isRising();
  doc["wifi"] = WiFi.status() == WL_CONNECTED ? "STA" : "AP";

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void WebServerModule::handleApiTide() {
  StaticJsonDocument<256> doc;
  doc["level"] = Modules::TideEngine::getTideLevel();
  doc["rising"] = Modules::TideEngine::isRising();

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void WebServerModule::handleApiConfig() {
  if (!server.hasArg("plain")) {
    server.send(400, "text/plain", "Body missing");
    return;
  }

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, server.arg("plain"));

  if (error) {
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }

  // Handle WiFi Config
  if (doc.containsKey("wifi")) {
    String ssid = doc["wifi"]["ssid"];
    String pass = doc["wifi"]["pass"];
    // Save to NVS via WifiManager
    Modules::WifiManager::setCredentials(ssid.c_str(), pass.c_str());
    Serial.println("[WEB] WiFi Config Received & Saved");
  }

  server.send(200, "application/json", "{\"status\":\"saved\"}");
  delay(500);
  ESP.restart();
}

void WebServerModule::handleApiFeedback() {
  if (!server.hasArg("plain"))
    return server.send(400, "text/plain", "Body missing");

  StaticJsonDocument<512> doc;
  deserializeJson(doc, server.arg("plain"));

  const char *name = doc["name"] | "Anonymous";
  const char *msg = doc["msg"] | "";

  // Log to Serial for the Desktop App to pick up (Telemetry)
  // Format: FEEDBACK:NAME:MSG
  Serial.printf("FEEDBACK:%s:%s\n", name, msg);

  server.send(200, "application/json", "{\"status\":\"received\"}");
}

// Helper to check if string is an IP address
bool isIp(String str) {
  for (size_t i = 0; i < str.length(); i++) {
    int c = str.charAt(i);
    if (c != '.' && (c < '0' || c > '9')) {
      return false;
    }
  }
  return true;
}

bool WebServerModule::isCaptivePortal() {
  if (!isIp(server.hostHeader())) {
    return true;
  }
  return false;
}
} // namespace Modules
