# Test Data Directory

This directory contains all test data used across unit, integration, and E2E tests.

## Structure

```
test-data/
├── docs/                    # Document samples for testing
│   ├── positive/           # Valid documents that should pass processing
│   ├── negative/           # Invalid documents that should fail gracefully
│   └── edge/               # Edge cases and boundary conditions
├── api/
│   └── payloads/          # API request/response examples
├── expected/
│   ├── normalized/        # Expected normalized output formats
│   └── snapshots/         # Visual snapshots for E2E tests
└── gemini/
    └── recorded/          # Recorded Gemini API responses for mocking
```

## Usage

### Document Samples (`docs/`)
Place sample documents (PDFs, JSON, text files) in the appropriate subdirectory:
- **positive/**: Documents that should be processed successfully
- **negative/**: Documents that should trigger error handling
- **edge/**: Documents testing boundary conditions

### API Payloads (`api/payloads/`)
Store example API request and response payloads in JSON format. These are used for:
- Testing API contract compliance
- Mocking external API calls
- Validating request/response transformations

### Expected Outputs (`expected/`)
- **normalized/**: Expected normalized data structures after processing
- **snapshots/**: Visual snapshots for E2E tests (screenshots, HTML snapshots)

### Recorded Gemini Responses (`gemini/recorded/`)
Store recorded responses from the Gemini API. These are used to:
- Mock Gemini API calls in tests
- Ensure tests run without real API keys
- Provide deterministic test results

To record a new response:
1. Make a real API call (with `GEMINI_API_KEY` set)
2. Save the response JSON to this directory
3. Reference it in tests using `mockGeminiResponse('filename.json')`

## File Naming Conventions

- Use descriptive names: `decision-analysis-1.json`, `invalid-document-1.pdf`
- Include numbers for multiple samples: `sample-1.json`, `sample-2.json`
- Use kebab-case for consistency
- Include file extensions

## Adding New Test Data

1. Add your test data file to the appropriate directory
2. Update tests to reference the new file
3. For Gemini responses, ensure they match the actual API response format
4. Commit test data files to version control (they're part of the test suite)

