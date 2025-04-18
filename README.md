# Akira-encryptor

**Akira-encryptor** es una herramienta de línea de comandos (CLI) desarrollada en TypeScript/Node.js, diseñada para el cifrado y descifrado de archivos y carpetas, utilizando `libsodium-wrappers` para garantizar un alto nivel de seguridad criptográfica. El proyecto está enfocado en la eficiencia, soportando archivos grandes mediante flujos (`streams`) y permitiendo seguimiento de progreso tanto a nivel individual como global.

> 🚧 El proyecto se encuentra actualmente en fase de desarrollo.  
> 🧪 La interfaz gráfica de usuario (GUI) aún **no está disponible**.

---

## 🧩 Características

- 🔐 **Cifrado/Descifrado de archivos** usando `libsodium-wrappers`
- 📂 **Soporte para carpetas** (procesamiento recursivo de subdirectorios)
- 📦 **Manejo eficiente de archivos grandes** mediante streaming
- 📊 **Visualización de progreso** en tiempo real (barra de progreso por archivo y global)
- 🧪 **Estructura modular** y lista para pruebas unitarias e integración (Vitest)
- 🧰 Preparado para ser usado como:
  - CLI local
  - Base para GUI (Electron, Wails, etc.)

---

## 🚀 Instalación y uso

> Requisitos: Node.js ≥ 18.x y npm

1. Clona el repositorio:

```bash
git clone https://github.com/JMMOLLER/akira-encryptor.git
cd Akira-encryptor
```
2. Instala las dependencias:

```bash
bun install
```

3. Ejecuta la CLI:

```bash
bun start
```

4. Sigue las instrucciones en la interfaz interactiva (inquirer) para cifrar o descifrar archivos o carpetas.

```bash
? ¿Qué desea realizar? (Use arrow keys)
❯ Encriptar
  Desencriptar
```

## 📁 Estructura del proyecto

```bash
Akira-encryptor/
├── cli/             # Lógica de línea de comandos
├── core/            # Lógica principal (Encryptor, configuración, utilidades)
│   ├── libs/
│   ├── utils/
│   └── configs/
├── gui/             # (Pendiente) Interfaz gráfica de usuario
├── tests/           # Pruebas unitarias y de integración
└── demo/            # Archivos de ejemplo
```

## ⚠️ Advertencia de uso

**Este proyecto se encuentra en etapa experimental.**
> No me responsabilizo por la pérdida, corrupción o inaccesibilidad de archivos causados por el uso de esta herramienta.
> Se recomienda realizar copias de seguridad antes de cifrar cualquier dato sensible.

## 🛠️ Estado actual

- [x] Funcionalidades de cifrado y descifrado implementadas

- [x] CLI interactiva con barras de progreso

- [x] Soporte para archivos grandes

- [ ] GUI en desarrollo (Electron)

- [ ] Empaquetado multiplataforma