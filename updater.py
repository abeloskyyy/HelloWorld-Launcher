import customtkinter as ctk

# Tema y apariencia (opcional)
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# Ventana principal
app = ctk.CTk()
app.title("HelloWorld Launcher")
app.resizable(False, False)
app.geometry("400x150")  # Ancho x Alto
app.iconbitmap("img/icon.ico")

app.eval('tk::PlaceWindow . center')

# Contenido de ejemplo
label = ctk.CTkLabel(app, text="Buscando actualizaciones...", font=("SegoeUI", 20))
label.pack(pady=20)

# Iniciar bucle
app.mainloop()
