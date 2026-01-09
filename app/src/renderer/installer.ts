// Installer Logic using Backend esptool.exe
(() => {
    // DOM Elements
    const btnWebInstall = document.getElementById('btn-web-install') as HTMLButtonElement | null;
    const modalBackdrop = document.getElementById('installer-modal-backdrop') as HTMLDivElement | null;
    const btnClose = document.getElementById('installer-modal-close') as HTMLButtonElement | null;
    const fwSelect = document.getElementById('install-fw-select') as HTMLSelectElement | null;
    const fileInput = document.getElementById('install-file-input') as HTMLInputElement | null;
    const btnFlash = document.getElementById('btn-start-flash') as HTMLButtonElement | null;
    const progressBar = document.getElementById('install-progress-bar') as HTMLDivElement | null;
    const logOutput = document.getElementById('install-log') as HTMLDivElement | null;
    const portSelect = document.getElementById('install-port-select') as HTMLSelectElement | null;

    // Logger
    function log(msg: string) {
        if (logOutput) {
            logOutput.innerText += msg + "\n";
            logOutput.scrollTop = logOutput.scrollHeight;
        }
        console.log('[Installer]', msg);
    }

    function updateProgress(percent: number) {
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    // Load available ports
    async function loadPorts() {
        if (!portSelect) return;
        portSelect.innerHTML = '<option value="" disabled selected>Carregando...</option>';

        try {
            const ports = await (window as any).serial.listPorts();
            portSelect.innerHTML = '';

            if (ports.length === 0) {
                const opt = document.createElement('option');
                opt.text = "Nenhuma porta encontrada";
                opt.disabled = true;
                opt.selected = true;
                portSelect.add(opt);
                return;
            }

            ports.forEach((p: any) => {
                const opt = document.createElement('option');
                opt.value = p.path;
                opt.text = `${p.path} - ${p.manufacturer || 'Serial Device'}`;
                portSelect.add(opt);
            });

            // Select first if available
            if (ports.length > 0) portSelect.selectedIndex = 0;

        } catch (e: any) {
            log("Erro ao listar portas: " + e.message);
            portSelect.innerHTML = '<option value="" disabled>Erro</option>';
        }
    }

    // Open/Close Modal
    function initInstaller() {
        if (btnWebInstall) {
            btnWebInstall.addEventListener('click', () => {
                if (modalBackdrop) {
                    modalBackdrop.classList.remove('hidden');
                    modalBackdrop.style.display = 'flex';
                    log("Installer Ready (Backend Mode).");
                    loadPorts(); // Refresh ports on open
                }
            });
        }

        if (btnClose && modalBackdrop) {
            btnClose.addEventListener('click', () => {
                modalBackdrop.classList.add('hidden');
                modalBackdrop.style.display = '';
            });
        }

        if (fwSelect) {
            fwSelect.addEventListener('change', () => {
                if (fwSelect.value === 'custom') {
                    fileInput?.click();
                } else {
                    if (fileInput) fileInput.value = '';
                }
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    log(`Selecionado: ${fileInput.files[0].name}`);
                } else {
                    if (fwSelect) fwSelect.value = 'micropython';
                }
            });
        }

        if (btnFlash) {
            btnFlash.addEventListener('click', startBackendFlash);
        }

        // Auto-Recovery Listener
        window.addEventListener('open-installer', async (e: any) => {
            if (modalBackdrop) {
                modalBackdrop.classList.remove('hidden');
                modalBackdrop.style.display = 'flex';
                log("Auto-Recovery Initiated.");

                await loadPorts();

                if (e.detail && e.detail.firmware) {
                    if (fwSelect) fwSelect.value = e.detail.firmware;
                }

                // If specific VID/PID logic needed, we'd iterate ports here to find matching one
                // But generally user just selects the port.
                // We could auto-select if we implemented getDeviceInfo in backend.
            }
        });
    }

    async function startBackendFlash() {
        const portPath = portSelect?.value;
        if (!portPath) {
            log("Erro: Nenhuma porta selecionada.");
            return;
        }

        log(`Iniciando flash na porta ${portPath}...`);
        updateProgress(0);

        try {
            // 1. Prepare Buffer
            let fileData: ArrayBuffer | null = null;
            let result: any = null;


            const selectedFw = fwSelect?.value;
            log(`DEBUG: Firmware Selecionado: '${selectedFw}'`);

            if (selectedFw === 'custom' && fileInput?.files?.[0]) {
                fileData = await fileInput.files[0].arrayBuffer();
                log("Firmware: Custom File");

                updateProgress(30);
                log("Enviando dados para o processo backend...");

                result = await (window as any).firmware.flashESP32(fileData, portPath);

            } else if (fwSelect?.value === 'micropython') {
                const url = 'https://micropython.org/resources/firmware/ESP32_GENERIC-20240105-v1.22.1.bin';
                log(`Solicitando download e flash via Backend...`);
                log(`URL: ${url}`);
                updateProgress(10);

                // Use backend download to avoid CORS
                result = await (window as any).firmware.flashESP32FromUrl(url, portPath);

            } else if (fwSelect?.value === 'test-app') {
                log("Modo: App de Teste (Offline)");

                updateProgress(10);
                log("Obtendo template interno...");

                // Get 'esp32_basic' template
                const template = await (window as any).firmware.getTemplate('esp32_basic');
                if (!template) {
                    log("Erro: Template 'esp32_basic' não encontrado no sistema.");
                    return;
                }

                log("Template: " + template.description);
                updateProgress(20);

                let success = true;
                let output = "";

                // Upload each file in template
                for (const file of template.files) {
                    log(`Gravando ${file.name}...`);
                    const dest = '/' + file.name;
                    const upRes = await (window as any).firmware.uploadMicroPythonContent(file.content, portPath, dest);
                    output += `[${file.name}] ${upRes.output}\n`;

                    if (!upRes.success) {
                        success = false;
                        log(`Erro ao gravar ${file.name}: ${upRes.output}`);
                        break;
                    }

                    // Delay to prevent race conditions or serial port locks
                    log("Aguardando estabilização...");
                    await new Promise(r => setTimeout(r, 2000));
                }

                if (success) {
                    // Reset board to load code
                    log("Reiniciando placa...");
                    await (window as any).firmware.resetESP32(portPath);
                    output += "\nPlate Reset Sent.";
                }

                result = { success, output };

            } else {
                log("Erro: Tipo de firmware desconhecido.");
                return;
            }

            if (result.success) {
                updateProgress(100);
                log("=== SUCESSO ===");
                log("Firmware gravado com sucesso!");
                log("Saída do esptool:");
                log(result.output);
                log("Reinicie o dispositivo (Unplug/Replug) se necessário.");
            } else {
                updateProgress(0);
                log("=== ERRO ===");
                log("Falha na gravação.");
                log("Saída de erro:");
                log(result.output);
            }

        } catch (e: any) {
            updateProgress(0);
            log("Exceção: " + e.message);
            console.error(e);
        }
    }

    // Auto-start
    initInstaller();
})();