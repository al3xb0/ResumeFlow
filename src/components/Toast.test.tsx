import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ToastContainer } from "./Toast";
import { useToastStore } from "../store/useToastStore";

afterEach(() => {
  cleanup();
  useToastStore.setState({ toasts: [] });
});

describe("ToastContainer", () => {
  it("renders export toasts with opaque, high-contrast styling", () => {
    useToastStore.setState({
      toasts: [
        { id: "toast-success", type: "success", message: "Resume exported as PDF" },
        { id: "toast-error", type: "error", message: "Failed to export DOCX" },
      ],
    });

    render(<ToastContainer />);

    const successMessage = screen.getByText("Resume exported as PDF");
    const successToast = successMessage.parentElement as HTMLElement;
    expect(successToast.className).toContain("bg-card/95");
    expect(successToast.className).toContain("border-success/40");
    expect(successMessage.className).toContain("text-card-foreground");
    expect(within(successToast).getByRole("button").className).toContain(
      "hover:text-card-foreground",
    );

    const errorMessage = screen.getByText("Failed to export DOCX");
    const errorToast = errorMessage.parentElement as HTMLElement;
    expect(errorToast.className).toContain("bg-card/95");
    expect(errorToast.className).toContain("border-destructive/40");
    expect(errorMessage.className).toContain("text-card-foreground");
  });
});
