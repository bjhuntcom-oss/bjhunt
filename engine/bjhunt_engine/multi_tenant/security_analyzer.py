"""
Pentest-tuned SecurityAnalyzer with ConfirmationPolicy.

W6 deliverable — placeholder. Real implementation will adapt
`openhands.sdk.SecurityAnalyzer` thresholds for pentest workloads:

| Tool category    | Risk    | Confirmation required? |
| ---              | ---     | ---                    |
| recon (nmap, …)  | LOW     | No (auto-execute)      |
| web exploit      | HIGH    | Yes — UI modal         |
| post-exploit     | HIGH    | Yes — UI modal         |
| C2 (Sliver)      | HIGH    | Yes — UI modal         |
| defender         | LOW     | No                     |

The frontend renders a confirmation modal when a HIGH action is queued; the
user clicks Approve/Deny which is sent back via LangGraph `interrupt()`
resume (per docs/architecture/02-STREAMING.md §"Mode interactif").
"""

from . import _require_openhands

_require_openhands("security_analyzer")

# Real wiring lands in W6:
# from openhands.sdk import SecurityAnalyzer, ConfirmationPolicy, Risk
#
# class PentestSecurityAnalyzer(SecurityAnalyzer):
#     ...
