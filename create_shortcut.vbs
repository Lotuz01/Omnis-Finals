Set WshShell = WScript.CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\Omnis App.lnk")
oShortcut.TargetPath = "c:\Users\Lotuz\Desktop\OMNIS\Omnis-Finals\start_app.bat"
oShortcut.IconLocation = "C:\Program Files\Google\Chrome\Application\chrome.exe, 0"
oShortcut.Description = "Atalho para Iniciar Omnis App"
oShortcut.Save