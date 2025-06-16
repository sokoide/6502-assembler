# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based 6502 assembler built with React, TypeScript, and Vite. It allows users to write 6502 assembly code and compile it to machine code in real-time.

## Architecture

The project follows a clean separation of concerns:

- **Frontend (React)**: `App.tsx` is the main component with assembly editor, output display, and error handling
- **Components**: `AssemblyEditor.tsx`, `OutputDisplay.tsx`, `ErrorDisplay.tsx` handle UI rendering  
- **Core Logic**: `services/assembler.ts` contains the two-pass assembler implementation
- **Instruction Set**: `services/opcodes.ts` defines the 6502 instruction set with opcodes and addressing modes
- **Type Definitions**: `types.ts` defines TypeScript interfaces for parsed lines and assembly results
- **Sample Code**: `services/sampleCodes.ts` provides example 6502 programs

## Key Implementation Details

### Two-Pass Assembler
The assembler in `services/assembler.ts` uses a traditional two-pass approach:
1. **Pass 1**: Parses syntax, builds symbol table (labels), calculates addresses
2. **Pass 2**: Resolves operands and generates final machine code

### Supported Features
- Labels (case-sensitive)
- Directives: `.org`, `.res`, `.byte`
- All standard 6502 addressing modes
- Hex (`$FF`), decimal (`123`), and character (`'A'`) literals
- Low/high byte operators (`#<LABEL`, `#>LABEL`)
- Comments (`;`)

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Makefile Commands

```bash
# Start development server
make dev

# Build project
make build

# Build and deploy to docs/ (GitHub Pages)
make install

# Clean all build artifacts
make clean
```

## File Structure

- `services/assembler.ts` - Main assembler logic with parsing and code generation
- `services/opcodes.ts` - 6502 instruction set definitions
- `services/sampleCodes.ts` - Example assembly programs
- `types.ts` - TypeScript type definitions for parser
- `components/` - React UI components
- `docs/` - Built site for GitHub Pages deployment

## Addressing Modes

The assembler supports all 6502 addressing modes:
- Immediate: `#$FF`, `#123`
- Zero Page: `$10`, `LABEL`
- Absolute: `$1000`, `LABEL`
- Indexed: `$10,X`, `$1000,Y`
- Indirect: `($1000)`, `($10,X)`, `($20),Y`
- Relative: `BNE LABEL` (for branches)