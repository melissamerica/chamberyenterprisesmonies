# Restore Anya v52, before expense learning

Project: appgprj_6aac814a582c8191bae021727ab0eb4c
Saved version: appgprj_6aac814a582c8191bae021727ab0eb4c~appgver_8cab6534c4fc8191952207de6004a492
Source commit: 11b71ac3ba2de172fa04d7124c73d25259d57568
Public address remains unchanged.

Redeploy that saved version to restore v52 code and presentation. Do not create a new Site, drop learning tables, replay applied migrations or overwrite current records. The extra learning tables are additive and v52 ignores them.

Anya_Restore_Point_v52_Before_Learning.zip was saved separately before source edits. It contains the untouched complete v52 source, restore metadata/instructions, full saved trip/receipt/review API records and bounded database table pages. Uploaded file binaries remain in existing R2 storage; file metadata is in the checkpoint. Browser-only records and device preferences are not captured. This is not an atomic database export. Never publish the private checkpoint data to GitHub.

A code rollback does not undo record edits made after the checkpoint. Inspect the private snapshot and recover only explicitly selected records if data recovery is needed.
