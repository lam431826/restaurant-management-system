import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../../api/auth";
import { useAuth } from "../../../context/useAuth";
import {
  getMyShift,
  getOpenNormalShifts,
  mergeFloatingShift,
} from "../../../services/shiftService";
import type {
  OpenShiftBrief,
  ShiftSummary,
} from "../../../services/shiftService";
import { CashMovementModal } from "./CashMovementModal";
import { CloseShiftModal } from "./CloseShiftModal";
import { LogoutWarningModal } from "./LogoutWarningModal";
import { OpenShiftModal } from "./OpenShiftModal";
import { ShiftMergeModal } from "./ShiftMergeModal";

export const useCashierShiftSession = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openShiftVisible, setOpenShiftVisible] = useState(false);
  const [closeShiftVisible, setCloseShiftVisible] = useState(false);
  const [cashMovementVisible, setCashMovementVisible] = useState(false);
  const [logoutWarningVisible, setLogoutWarningVisible] = useState(false);
  const [logoutAfterClose, setLogoutAfterClose] = useState(false);
  const [mergeVisible, setMergeVisible] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<OpenShiftBrief[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeCash, setMergeCash] = useState("");
  const [mergeNote, setMergeNote] = useState("");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState("");

  useEffect(() => {
    getMyShift()
      .then((currentShift) => {
        setShift(currentShift);
        if (!currentShift) setOpenShiftVisible(true);
      })
      .catch(() => {
        setShift(null);
        setOpenShiftVisible(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const performLogout = async () => {
    try {
      await logout();
    } catch {
      // Local authentication state must still be cleared if server logout fails.
    }
    signOut();
    navigate("/login", { replace: true });
  };

  const requestLogout = () => {
    if (shift?.status === "OPEN") {
      setLogoutWarningVisible(true);
      return;
    }
    void performLogout();
  };

  const requestMerge = async () => {
    setMergeError("");
    setMergeTargetId("");
    setMergeCash("");
    setMergeNote("");
    setMergeVisible(true);
    try {
      setMergeTargets(await getOpenNormalShifts());
    } catch {
      setMergeTargets([]);
    }
  };

  const submitMerge = async () => {
    if (!shift) return;
    if (!mergeTargetId) {
      setMergeError("Vui lòng chọn ca chính để gộp.");
      return;
    }

    const cash = parseInt(mergeCash.replace(/\D/g, "") || "0", 10);
    setMergeLoading(true);
    setMergeError("");
    try {
      await mergeFloatingShift(
        shift.id,
        mergeTargetId,
        cash,
        mergeNote.trim() || undefined,
      );
      setMergeVisible(false);
      setShift(null);
      setOpenShiftVisible(true);
    } catch (error) {
      setMergeError(
        error instanceof Error ? error.message : "Không thể gộp ca tạm.",
      );
    } finally {
      setMergeLoading(false);
    }
  };

  const overlays = (
    <>
      {!shift && openShiftVisible && (
        <OpenShiftModal
          employeeName={user?.fullName ?? user?.username ?? "Nhân viên"}
          onOpened={(openedShift) => {
            setShift(openedShift);
            setOpenShiftVisible(false);
          }}
          onLogout={requestLogout}
          onClose={() => setOpenShiftVisible(false)}
        />
      )}
      {closeShiftVisible && shift && (
        <CloseShiftModal
          shift={shift}
          cashierName={user?.username ?? user?.fullName ?? "—"}
          onClosed={() => {
            setShift(null);
            setCloseShiftVisible(false);
            if (logoutAfterClose) {
              setLogoutAfterClose(false);
              void performLogout();
            }
          }}
          onCancel={() => {
            setCloseShiftVisible(false);
            setLogoutAfterClose(false);
          }}
        />
      )}
      {mergeVisible && shift && (
        <ShiftMergeModal
          targets={mergeTargets}
          targetId={mergeTargetId}
          cash={mergeCash}
          note={mergeNote}
          loading={mergeLoading}
          error={mergeError}
          onTargetChange={setMergeTargetId}
          onCashChange={setMergeCash}
          onNoteChange={setMergeNote}
          onSubmit={() => void submitMerge()}
          onClose={() => setMergeVisible(false)}
        />
      )}
      {logoutWarningVisible && (
        <LogoutWarningModal
          onCloseShiftAndLogout={() => {
            setLogoutWarningVisible(false);
            setLogoutAfterClose(true);
            setCloseShiftVisible(true);
          }}
          onLogoutOnly={() => {
            setLogoutWarningVisible(false);
            void performLogout();
          }}
          onCancel={() => setLogoutWarningVisible(false)}
        />
      )}
      {cashMovementVisible && shift && (
        <CashMovementModal
          shift={shift}
          onUpdated={setShift}
          onClose={() => setCashMovementVisible(false)}
        />
      )}
    </>
  );

  return {
    shift,
    loading,
    requestOpenShift: () => setOpenShiftVisible(true),
    requestCloseShift: () => setCloseShiftVisible(true),
    requestCashMovement: () => setCashMovementVisible(true),
    requestMerge,
    requestLogout,
    overlays,
  };
};
