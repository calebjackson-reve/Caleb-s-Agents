# Example engagers list (made-up people)

Everything in this folder is an example. Every person, town pairing, handle, phone number and comment is made up.
It is the template for the real list and the fixture `two_today_test.py` runs on.

- `engagers.csv`: one row per thing someone did on Caleb's own content. Columns: `handle, platform, action, date, post, post_type, said`.
  - `action`: like, follow, comment, story_reply, share or dm.
  - `post_type`: listing, just sold, open house, market update, neighborhood or personal. Leave it blank when the post is in `posts.csv`.
  - `said`: optional, what they wrote in a comment or message. A question mark puts the row on the reply list.
- `posts.csv`: optional. One row per post (`post, post_type`), filled once, so the type is not typed on every row.
- `handles.csv`: `person_id, platform, handle`. The real one comes from `aire/enrichment/execution/merge_hwc.py`.
- `people.json`: a made-up stand-in for the CRM feed, so the gates and hold rules have something to read.

The real list is filled in by hand, about five minutes a day, and saved as `aire/enrichment/out/engagers.csv`
(that folder is git-ignored). Nothing reads Instagram or Facebook, and nothing is uploaded anywhere.

    python3 aire/pipeline-app/two_today.py --example     # this folder
    python3 aire/pipeline-app/two_today.py               # the real list on the Mac, report in aire/pipeline-app/out/
