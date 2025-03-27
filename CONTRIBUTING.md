# Contributing to Arcade Games

Thank you for considering contributing to the Arcade Games project! This document outlines the process for contributing and some best practices to follow.

## Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes using conventional commit messages
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

## Code Style

- Use meaningful variable and function names
- Write comments for complex logic
- Follow the existing code style and formatting
- Write tests for new features

## Adding a New Game

1. Create a new component in `frontend/src/components/games/`
2. Add the backend endpoints in `backend/src/routes/gameRoutes.js`
3. Implement the logic in `backend/src/controllers/gameController.js`
4. Update the games list in the controller
5. Add the new route in `frontend/src/App.js`

## Getting Help

If you have questions about the codebase or need help with your contribution, feel free to open an issue with the "question" label.

Thank you for your contributions! 