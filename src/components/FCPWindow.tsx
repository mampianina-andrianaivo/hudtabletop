import React, { ReactNode } from 'react';
import { Check, CheckCheck, X, Trash2, RotateCcw, ArrowLeft } from 'lucide-react';

interface FCPWindowProps {
  title?: string;
  validateLabel?: string; // 'Valider' | 'Ok' | 'Confirmer' | 'Restituer'
  cancelLabel?: string; // 'X' | 'Annuler' | 'Archiver' | 'Restituer' | 'Non'
  validateIcon?: React.ComponentType<{ className?: string }>;
  cancelIcon?: React.ComponentType<{ className?: string }>;
  onValidate?: () => void;
  onCancel?: () => void;
  validateDisabled?: boolean;
  cancelIsRed?: boolean;
  children: ReactNode;
  isEdit?: boolean;
  hasChanges?: boolean;
  validateIsGreen?: boolean;
  onCloseWithoutSaving?: () => void;
}

export const FCPWindow: React.FC<FCPWindowProps> = ({
  title,
  validateLabel = 'Valider',
  cancelLabel = 'X',
  validateIcon,
  cancelIcon,
  onValidate,
  onCancel,
  validateDisabled = false,
  cancelIsRed = false,
  children,
  isEdit = false,
  hasChanges = false,
  validateIsGreen = false,
  onCloseWithoutSaving,
}) => {
  // Determine Validate Icon (CheckCheck for Valider/Confirmer/Enregistrer, Check for Ok, RotateCcw for Restituer)
  let ValidateIconComp = validateIcon || CheckCheck;
  let validateTitle = validateLabel;

  if (validateLabel.toLowerCase() === 'ok') {
    validateTitle = 'OK';
  } else if (validateLabel.toLowerCase().includes('restituer')) {
    ValidateIconComp = RotateCcw;
    validateTitle = 'Restituer';
  }

  // Determine Cancel Icon
  let CancelIconComp = cancelIcon;
  let cancelTitle = cancelLabel;

  const cLower = cancelLabel ? cancelLabel.toLowerCase() : '';
  if (!CancelIconComp) {
    if (cLower === 'x' || cLower === 'quitter' || cLower === 'fermer' || cLower === '') {
      CancelIconComp = X;
      cancelTitle = 'Fermer';
    } else if (cLower.includes('archiver') || cLower.includes('annuler') || cLower.includes('supprimer')) {
      CancelIconComp = Trash2; // Poubelle
      cancelTitle = cLower.includes('archiver') ? 'Archiver' : 'Annuler';
    } else if (cLower.includes('restituer')) {
      CancelIconComp = RotateCcw; // Restituer
      cancelTitle = 'Restituer';
    } else {
      CancelIconComp = X;
      cancelTitle = 'Fermer';
    }
  }

  // Double checkmark visibility rules:
  // - Creation: Visible when !validateDisabled
  // - Edit: Visible when hasChanges && !validateDisabled
  const shouldShowValidate = isEdit
    ? (hasChanges && !validateDisabled)
    : !validateDisabled;

  const isDoubleCheck = ValidateIconComp === CheckCheck;

  return (
    <div className="absolute inset-0 z-50 bg-[#E0E0E0] text-[#000000] flex flex-col w-full h-full overflow-hidden shadow-2xl">
      {/* Header bar matching theme */}
      <div className="h-[45px] min-h-[45px] bg-[#000000] px-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="f-app font-bold truncate tracking-wide text-[#FFFFFF]">
              {title ? `FCP - ${title}` : 'FCP (Fenêtre Custom Prompt)'}
            </span>
          </div>

          {/* Buttons on header bar: icon-only signs */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Always pre-reserved slot for validation button */}
            {onValidate && (
              <div className="h-[35px] w-[38px] relative shrink-0">
                <button
                  type="button"
                  onClick={onValidate}
                  disabled={!shouldShowValidate}
                  title={validateTitle}
                  className={`absolute inset-0 flex items-center justify-center border-none transition-all duration-150 ${
                    shouldShowValidate
                      ? validateIsGreen
                        ? 'bg-[#116611] hover:bg-[#004400] cursor-pointer opacity-100 text-[#FFFFFF]'
                        : isDoubleCheck
                          ? 'bg-[#FFD700] hover:bg-[#E6C200] cursor-pointer opacity-100 text-[#000000]'
                          : 'bg-[#222222] hover:bg-[#111111] cursor-pointer opacity-100 text-[#FFFFFF]'
                      : 'opacity-0 pointer-events-none select-none invisible'
                  }`}
                >
                  <ValidateIconComp className="w-5 h-5 shrink-0" />
                </button>
              </div>
            )}

            {/* Left arrow (back) button for discarding changes in edit mode */}
            {isEdit && onCloseWithoutSaving && (
              <button
                type="button"
                onClick={onCloseWithoutSaving}
                title="Retour sans enregistrer"
                className="h-[35px] w-[38px] flex items-center justify-center border-none cursor-pointer text-[#FFFFFF] bg-[#222222] hover:bg-[#111111] shrink-0"
              >
                <ArrowLeft className="w-5 h-5 shrink-0" />
              </button>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                title={cancelTitle}
                className={`h-[35px] w-[38px] flex items-center justify-center border-none transition-none cursor-pointer text-[#FFFFFF] ${
                  cancelIsRed || cLower.includes('archiver') || cLower.includes('annuler')
                    ? 'bg-[#E11D48] hover:bg-[#BE123C]'
                    : cLower.includes('restituer')
                    ? 'bg-[#116611] hover:bg-[#004400]'
                    : 'bg-[#444444] hover:bg-[#333333]'
                }`}
              >
                <CancelIconComp className="w-5 h-5 shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Main Working Canvas of FCP */}
        <div className="flex-1 bg-[#E0E0E0] p-4 tab-content-scroll">
          {children}
        </div>
      </div>
    );
  };
