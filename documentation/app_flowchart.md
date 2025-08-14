flowchart TD
    User[User] --> API[API Endpoint]
    API --> Auth[Authentication]
    Auth --> Entry[Card Enrollment Request]
    Entry --> Validation{Valid Data?}
    Validation -->|Yes| Processing[Process Card]
    Validation -->|No| Reject[Reject Request]
    Processing --> Normalize[Normalize Data]
    Normalize --> Rules{Business Rules Approved?}
    Rules -->|Yes| Transaction[Initiate Transaction]
    Rules -->|No| Review[Manual Review]
    Transaction --> Gateway[Payment Gateway Integration]
    Gateway -->|Success| Success[Transaction Success]
    Gateway -->|Failure| Failure[Transaction Failure]
    Success --> UpdateDB[Update Card Status]
    Failure --> Retry[Retry or Escalate]
    Retry --> UpdateDB
    Review --> NotifyAdmin[Notify Administrator]
    UpdateDB --> NotifyUser[Notify User]
    NotifyUser --> End[End]
    NotifyAdmin --> End