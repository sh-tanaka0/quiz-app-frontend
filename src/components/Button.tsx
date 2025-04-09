import React from "react";

// TODO: vitest動作確認用のコンポーネント、後で削除する
interface ButtonProps {
  label: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      onClick={onClick}
      data-testid="button"
    >
      {label}
    </button>
  );
};

export default Button;
