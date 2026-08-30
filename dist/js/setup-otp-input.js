/**
 * OTP-Input Setup
 * ===============
 *
 * Auto-advance + Paste-Verteilung + Backspace-Zurück + Arrow-Navigation
 * über die Felder von `.otp-input`.
 */
import { combineCleanups } from "./lifecycle.js";
const cleanups = new WeakMap();
function setupGroup(group) {
    const existing = cleanups.get(group);
    if (existing)
        return existing;
    const controller = new AbortController();
    const signal = controller.signal;
    const fields = Array.from(group.querySelectorAll(".otp-input__field"));
    fields.forEach((field, i) => {
        field.addEventListener("input", () => {
            field.value = field.value.replace(/[^0-9]/g, "").slice(0, 1);
            if (field.value && i < fields.length - 1)
                fields[i + 1].focus();
        }, { signal });
        field.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !field.value && i > 0)
                fields[i - 1].focus();
            else if (e.key === "ArrowLeft" && i > 0) {
                fields[i - 1].focus();
                e.preventDefault();
            }
            else if (e.key === "ArrowRight" && i < fields.length - 1) {
                fields[i + 1].focus();
                e.preventDefault();
            }
        }, { signal });
        field.addEventListener("paste", (e) => {
            e.preventDefault();
            const data = (e.clipboardData?.getData("text") || "").replace(/[^0-9]/g, "");
            for (let j = 0; j < data.length && i + j < fields.length; j++)
                fields[i + j].value = data[j];
            fields[Math.min(i + data.length, fields.length - 1)]?.focus();
        }, { signal });
    });
    const cleanup = () => {
        controller.abort();
        cleanups.delete(group);
    };
    cleanups.set(group, cleanup);
    return cleanup;
}
export function setupOtpInput(root = document) {
    const groups = root.querySelectorAll(".otp-input");
    return combineCleanups([...groups].map(setupGroup));
}
