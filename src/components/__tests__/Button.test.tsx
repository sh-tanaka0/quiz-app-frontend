import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../Button";

// TODO: vitest動作確認用のコンポーネント、後で削除する
describe("Button Component", () => {
  it("renders button with label", () => {
    render(<Button label="Click me" />);
    const buttonElement = screen.getByTestId("button");
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveTextContent("Click me");
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    const buttonElement = screen.getByTestId("button");
    fireEvent.click(buttonElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
