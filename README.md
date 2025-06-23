# 6502 Assembler

A modern, browser-based 6502 assembler built with React and TypeScript. Write and assemble 6502 code in real-time with syntax highlighting, error reporting, and instant machine code generation.

## ✨ Features

- **Real-time Assembly**: Write 6502 assembly code and see machine code generated instantly
- **Complete Instruction Set**: Full support for all 6502 instructions and addressing modes
- **Syntax Highlighting**: Enhanced code editor with assembly syntax highlighting
- **Error Reporting**: Detailed error messages with line numbers and context
- **Symbol Table**: View labels and their resolved addresses
- **Sample Programs**: Built-in examples to get you started
- **Modern Web Interface**: Clean, responsive design that works on desktop and mobile

## 🚀 Demo

Try it live at: **https://sokoide.github.io/6502-assembler/**

## 🏗️ Architecture

This project implements a traditional two-pass assembler:

1. **Pass 1**: Parse syntax, build symbol table, calculate addresses
2. **Pass 2**: Resolve operands and generate final machine code

### Supported Features

- **Labels**: Case-sensitive label support
- **Directives**: `.org`, `.res`, `.byte`, `.word`, `.dword`, `.ascii`, `.asciiz`
- **Addressing Modes**: All standard 6502 addressing modes
- **Number Formats**: Hexadecimal (`$FF`), decimal (`123`), character (`'A'`)
- **Operators**: Low/high byte operators (`#<LABEL`, `#>LABEL`)
- **Comments**: Line comments using `;`

### Addressing Modes Supported

| Mode | Syntax | Example |
|------|--------|---------|
| Immediate | `#value` | `LDA #$FF` |
| Zero Page | `address` | `LDA $10` |
| Zero Page,X | `address,X` | `LDA $10,X` |
| Absolute | `address` | `LDA $1000` |
| Absolute,X | `address,X` | `LDA $1000,X` |
| Absolute,Y | `address,Y` | `LDA $1000,Y` |
| Indirect | `(address)` | `JMP ($1000)` |
| Indexed Indirect | `(address,X)` | `LDA ($10,X)` |
| Indirect Indexed | `(address),Y` | `LDA ($20),Y` |
| Relative | `label` | `BNE LOOP` |

## 🛠️ Development

### Prerequisites

- Node.js 16+ 
- npm

### Quick Start

```bash
# Clone the repository
git clone https://github.com/sokoide/6502-assembler.git
cd 6502-assembler

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint
```

### Using Makefile

```bash
# Start development server
make dev

# Build project
make build

# Build and deploy to docs/ (GitHub Pages)
make install

# Clean build artifacts
make clean
```

## 🎯 Usage Example

```assembly
; Simple 6502 program
        .org $8000

START:  LDX #$00        ; Initialize X register
        LDY #$10        ; Initialize Y register

LOOP:   LDA DATA,X      ; Load data
        STA $0200,Y     ; Store to memory
        INX             ; Increment X
        INY             ; Increment Y
        CPX #$04        ; Compare with 4
        BNE LOOP        ; Branch if not equal

        BRK             ; Break

DATA:   .byte $01, $02, $03, $04
```

## 🏛️ Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── AssemblyEditor.tsx
│   │   ├── OutputDisplay.tsx
│   │   └── ErrorDisplay.tsx
│   ├── services/           # Core logic
│   │   ├── assembler.ts    # Two-pass assembler
│   │   ├── opcodes.ts      # 6502 instruction set
│   │   └── sampleCodes.ts  # Example programs
│   ├── types.ts           # TypeScript definitions
│   └── App.tsx            # Main application
├── docs/                  # GitHub Pages deployment
├── Makefile              # Build automation
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎓 About the 6502

The MOS Technology 6502 is an 8-bit microprocessor that was widely used in home computers and game consoles of the 1970s and 1980s, including:

- Apple II
- Commodore 64
- Nintendo Entertainment System (NES)
- Atari 2600

This assembler helps you learn and experiment with 6502 assembly language programming in a modern, accessible way.

## 🐛 Debug Instructions

1. Start the development server:
   ```bash
   npm run dev
   ```

2. For VS Code debugging:
   - Press `F5` to run under the Edge & VS Code debugger
   - Set breakpoints in TypeScript files
   - Use browser developer tools for additional debugging