# RELEASE 3.1.1

## Fixed

- **Account Profile Avatar Isolation**: Resolved avatar cross-contamination between different account types sharing the same nickname.
- **Offline Profile Icon**: Offline accounts now strictly display the standard user profile icon instead of loading Minecraft skins or heads.
- **Premium Minecraft Head Display**: Microsoft accounts accurately display the official Minecraft character head when no custom profile picture is configured, preventing unintended fallbacks.
- **HelloWorld Custom Avatar & Initials**: HelloWorld accounts display their chosen profile photo or generated single initial letter with zero data leakage, eliminating accidental Steve skin heads in profile views.
- **Update Download Resilience**: Cleaned up updater lifecycle so closing or quitting the launcher while an update is downloading aborts cleanly, removes temporary `.tmp_` files, and prevents orphaned file accumulation.
- **Update Badge Disk Verification**: Verified that persisted update packages actually exist on disk before restoring the "Update Ready" dock badge.
- **Complete Process Termination on Update & Quit**: When applying updates or closing the launcher, running Minecraft instances and launcher processes are terminated cleanly so updates install without locked files.
- **Announcement Update Action**: Restored functionality of the update button in community announcement banners.
