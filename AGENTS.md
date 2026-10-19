# Project rules
- Bound completion-photo authentication, uploads, and record writes with the shared request timeout helper so stalled network requests cannot leave the completion form permanently busy.
- Use the completion-photo limit helper at selection and submission, and block overlapping preparation batches so asynchronous compression cannot bypass the photo cap.