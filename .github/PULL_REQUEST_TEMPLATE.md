# Pull Request

## PR Description
<!-- Please provide a clear and detailed description of your changes -->

**Type of Change:**
- [ ] Feature (new functionality)
- [ ] Bug fix (fixes an issue)
- [ ] Refactor (code improvement without functional changes)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security enhancement

**Description:**
<!-- Provide a clear description of the changes with technical context -->

**Motivation and Context:**
<!-- Explain the business value and motivation behind these changes -->

**Breaking Changes:**
<!-- List any breaking changes and provide migration steps if applicable -->
- [ ] No breaking changes
- [ ] Breaking changes (provide migration guide below)

**Performance Impact:**
<!-- Describe any performance implications and include benchmark results if relevant -->

## Related Issues
<!-- Reference any related issues using the GitHub issue linking syntax -->

- Fixes: #
- Implements: #
- Resolves: #
- Depends on: #

## Implementation Details

**Technical Approach:**
<!-- Describe your implementation approach and key architectural decisions -->

**Changes Include:**
- [ ] Database schema/query modifications
- [ ] API endpoint changes
- [ ] UI component updates
- [ ] Cache strategy modifications
- [ ] Security-related changes

**Technical Details:**
<!-- Provide detailed technical implementation information -->

**Security Implications:**
<!-- Describe any security implications and mitigations -->

## Testing

**Test Coverage:**
<!-- Describe the testing approach and coverage -->

- [ ] Unit tests added/updated (>80% coverage)
- [ ] Integration tests added/updated
- [ ] E2E tests for UI changes
- [ ] Performance benchmarks run
- [ ] Security testing completed

**Test Results:**
<!-- Provide summary of test results -->

**Manual Testing Checklist:**
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Tested responsive layouts
- [ ] Tested accessibility features

## Checklist
<!-- Ensure all items are completed before requesting review -->

### Code Quality
- [ ] Code follows project style guide
- [ ] ESLint/Prettier checks pass
- [ ] TypeScript types are properly defined
- [ ] No console.log or debugging artifacts
- [ ] Code is properly commented
- [ ] Complex logic is documented

### Documentation
- [ ] README.md updated if needed
- [ ] API documentation updated
- [ ] JSDoc comments added/updated
- [ ] Change log updated
- [ ] Migration guide provided (if breaking changes)

### Database
- [ ] Database migrations are reversible
- [ ] Indexes added for new queries
- [ ] No N+1 query issues introduced

### Security
- [ ] No security vulnerabilities introduced
- [ ] Input validation implemented
- [ ] Authentication/authorization checks added
- [ ] Sensitive data is properly handled

### Performance
- [ ] Performance impact is acceptable
- [ ] No memory leaks introduced
- [ ] Efficient query patterns used
- [ ] Proper cache invalidation implemented

### CI/CD
- [ ] All CI checks passing
- [ ] Build succeeds in staging environment
- [ ] Feature flags configured (if applicable)
- [ ] Monitoring/alerts configured

## Screenshots
<!-- Add screenshots or screen recordings for UI changes -->

<details>
<summary>Screenshots</summary>

<!-- Add your screenshots here -->

</details>

## Additional Notes
<!-- Any additional information that reviewers should know -->

---
<!-- PR Title Format: type(scope): description -->
<!-- Example: feat(metrics): add distribution chart for revenue growth -->