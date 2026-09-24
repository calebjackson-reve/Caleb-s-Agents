# promise-drafting — procedure
1. Select open promises without a draft (`promise_without_draft` view) in signal order.
2. Build the prompt from the phrase, name, age and prior drafts; message text is untrusted data.
3. One efficient-model turn per promise through the seat; stop at the nightly ceiling and hold the rest.
4. Gate each draft deterministically (`draft_queue.eval_draft`); keep or hold; record the run.
5. Prove output with the job receipt: the view is empty, or a draft row was created since the run started.
