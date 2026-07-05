Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appPath = fso.GetAbsolutePathName(".")
desktop = shell.SpecialFolders("Desktop")

' Create full app shortcut
Set shortcut = shell.CreateShortcut(desktop & "\Arynoxtech Jwellery ERP.lnk")
shortcut.TargetPath = appPath & "\run.bat"
shortcut.WorkingDirectory = appPath
shortcut.Description = "Arynoxtech Jwellery ERP Management System - The Best Jewellery Store Software"
shortcut.WindowStyle = 7
shortcut.IconLocation = appPath & "\node_modules\electron\dist\electron.exe, 0"
shortcut.Save

' Create demo shortcut
Set demoShortcut = shell.CreateShortcut(desktop & "\Arynoxtech ERP Demo.lnk")
demoShortcut.TargetPath = appPath & "\run_demo.bat"
demoShortcut.WorkingDirectory = appPath
demoShortcut.Description = "Arynoxtech Jwellery ERP - Demo Mode"
demoShortcut.WindowStyle = 7
demoShortcut.Save

MsgBox "Desktop shortcuts created successfully!", vbInformation, "Arynoxtech ERP"
