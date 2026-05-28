/**
 * OTP-Input Setup
 * ===============
 *
 * Auto-advance + Paste-Verteilung + Backspace-Zurück + Arrow-Navigation
 * über die Felder von `.otp-input`.
 */
export function setupOtpInput(root = document) {
    const groups = root.querySelectorAll(".otp-input");
    groups.forEach((group) => {
        if (group.dataset.otpInit === "1")
            return;
        group.dataset.otpInit = "1";
        const fields = Array.from(group.querySelectorAll(".otp-input__field"));
        fields.forEach((field, i) => {
            field.addEventListener("input", () => {
                /* Auf ein einzelnes Zeichen begrenzen, dann zum nächsten Feld */
                field.value = field.value.replace(/[^0-9]/g, "").slice(0, 1);
                if (field.value && i < fields.length - 1) {
                    fields[i + 1].focus();
                }
            });
            field.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && !field.value && i > 0) {
                    fields[i - 1].focus();
                }
                else if (e.key === "ArrowLeft" && i > 0) {
                    fields[i - 1].focus();
                    e.preventDefault();
                }
                else if (e.key === "ArrowRight" && i < fields.length - 1) {
                    fields[i + 1].focus();
                    e.preventDefault();
                }
            });
            field.addEventListener("paste", (e) => {
                e.preventDefault();
                const data = (e.clipboardData?.getData("text") || "")
                    .replace(/[^0-9]/g, "");
                for (let j = 0; j < data.length && i + j < fields.length; j++) {
                    fields[i + j].value = data[j];
                }
                const focusIdx = Math.min(i + data.length, fields.length - 1);
                fields[focusIdx].focus();
            });
        });
    });
}
