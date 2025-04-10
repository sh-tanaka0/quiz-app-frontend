import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "../ui/button";

export interface ConfirmationDialogProps {
  show: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  title?: string;
}

const ConfirmationDialog = ({
  show,
  message,
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "キャンセル",
  title = "確認",
}: ConfirmationDialogProps) => {
  // showがfalseなら何も描画しない
  if (!show) return null;

  return (
    <AlertDialog
      open={show}
      // onOpenChange は Esc キーで閉じられた場合などのハンドリングに残す
      onOpenChange={(open) => {
        if (!open) {
          // ダイアログが閉じられたら onCancel を呼ぶ
          // (Actionボタンクリック時も内部的にこれが呼ばれる可能性がある)
          onCancel();
        }
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-base text-gray-700">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* AlertDialogFooter 内のボタンを通常の Button コンポーネントに変更 */}
        <AlertDialogFooter className="flex gap-2 pt-4 sm:justify-end">
          {" "}
          {/* 見た目の調整 */}
          {/* 確認ボタン (通常の Button) */}
          <Button
            onClick={onConfirm} // 直接 onConfirm を呼び出す
            className="mt-0 bg-orange-500 text-white hover:bg-orange-600" // スタイル例
          >
            {confirmText}
          </Button>
          {/* キャンセルボタン (通常の Button) */}
          <Button
            variant="outline"
            onClick={onCancel} // 直接 onCancel を呼び出す
            className="mt-0 border-gray-300 text-gray-800 hover:bg-gray-100" // スタイル例
          >
            {cancelText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;
