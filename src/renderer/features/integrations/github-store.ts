/**
 * GitHub Store — re-exports GitHub-related state from the integrations store.
 *
 * GitHub UI state (PR selection, repo context, issue dialog) is part of the
 * unified integrations store; this file provides a domain-scoped import path.
 */

export { useIntegrationsStore as useGitHubStore } from './communications-store';
