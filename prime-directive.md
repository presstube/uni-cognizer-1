# Prime Directive

Core coding principles for this project.

## 1. Functional Programming

- Prefer pure functions over classes
- Single responsibility per function
- Avoid side effects where possible

## 2. Immutable State

- Prefer immutable data structures
- Use `const` by default
- Avoid mutating passed parameters

## 3. Unidirectional Data Flow

- Data flows one way through the application
- Parent components pass data down
- Child components return results or callbacks up

## 4. File Size

- Target under 80 lines of code per file where possible
- Break large files into smaller, focused modules
- Each file should have a single clear purpose

## 5. Minimal Libraries

- Use vanilla JavaScript where practical
- Only add libraries when they provide clear value
- Prefer ES6 modules and native browser APIs

