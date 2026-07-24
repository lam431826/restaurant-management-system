# Use Case Specification — Payment Module (`UC-PM`)

> Nguồn: `Backend/src/main/java/com/rms/restaurant/module/payment` (Invoice, Payment, VNPAY, Promotion).
> Định dạng theo template mẫu UC-PM-08 (Split Invoice) do người dùng cung cấp.
> Ghi chú đánh số: tài liệu gốc của người dùng đánh UC-PM-08 ở mục 2.1.5, tức các mục trước đó có thể đã được gộp thành ít sub-section hơn số UC. File này đánh số tuần tự 2.1.1 → 2.1.10 theo đúng thứ tự nghiệp vụ (tạo hóa đơn → xem → giảm giá → thanh toán → tách/gộp → gửi hóa đơn); có thể đánh số lại cho khớp với tài liệu tổng nếu cần.
> Không đưa vào danh sách: 2 hàm service không có controller nào gọi tới (`InvoiceService.listInvoices()`/`getDetail()` — code chết, gắn nhãn cũ PM-06/PM-07) và CRUD Khuyến mãi (Promotion là entity hỗ trợ, không thuộc luồng nghiệp vụ Payment/Invoice cốt lõi).

## 1. Use Case List

| Use Case ID | Use Case | Primary Actor(s) | Mô tả ngắn |
|---|---|---|---|
| UC-PM-01 | Generate Invoice from Order | Cashier, Administrator | Tạo hóa đơn từ các món đã sẵn sàng/đã phục vụ của một đơn hàng. |
| UC-PM-02 | List Invoices | Cashier, Manager, Administrator | Tìm kiếm/lọc danh sách hóa đơn theo trạng thái, đơn hàng, đã thanh toán. |
| UC-PM-03 | View Invoice Detail | Cashier, Manager, Administrator | Xem chi tiết hóa đơn, gồm dòng phân bổ, khuyến mãi, quan hệ tách/gộp. |
| UC-PM-04 | Apply Promotion Discount to Invoice | Cashier, Administrator | Áp mã khuyến mãi vào một hóa đơn chưa thanh toán. |
| UC-PM-05 | Process Cash Payment | Cashier | Ghi nhận thanh toán tiền mặt cho hóa đơn. |
| UC-PM-06 | Process QR Payment | Cashier | Khởi tạo, xác nhận hoặc hủy một giao dịch thanh toán QR (giả lập). |
| UC-PM-07 | Process VNPAY Payment | Cashier | Tạo link thanh toán VNPAY; hệ thống tự đối soát qua IPN hoặc thủ công qua QueryDR. |
| UC-PM-08 | Split Invoice | Cashier, Administrator | Tách số lượng món đã chọn từ hóa đơn nguồn thành các hóa đơn con. |
| UC-PM-09 | Merge Invoices | Cashier, Administrator | Gộp nhiều hóa đơn chưa thanh toán cùng một đơn hàng thành một hóa đơn đích. |
| UC-PM-10 | Send Invoice by Email | Cashier, Manager, Administrator | Gửi hóa đơn cho khách qua email. |

---

## 2. Use Case Specifications

### 2.1.1 UC-PM-01 — Generate Invoice from Order

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Administrator |
| Secondary Actors | None |
| Description | As a cashier, I want to generate an invoice from an order's ready/served items so that the guest can be billed and pay. |
| Preconditions | - The order exists, is not CANCELLED/CLOSED, and has no existing invoice.<br>- The order has at least one item that is READY or SERVED (payable); no item is still PENDING/COOKING.<br>- If a promotion code is supplied, the promotion is active, within its valid date range, and has not reached its usage limit. |
| Postconditions | - A new ACTIVE, unpaid Invoice is created with one allocation per payable order item (full quantity, unit-price snapshot).<br>- If a promotion was applied, its usage counter is incremented and the invoice records the discount.<br>- Invoice subtotal/discount/total are computed and stored consistently (total ≥ 0, positive subtotal). |
| Normal Sequence/Flow | Step 1 - Cashier chooses "Generate Invoice" for an order whose items are ready/served.<br>Step 2 - The system locks the order and validates every item's eligibility.<br>Step 3 (optional) - Cashier enters a promotion code; the system validates it and computes the discount.<br>Step 4 - The system computes subtotal/discount/total and creates the Invoice with its allocations.<br>Step 5 - The system returns the created invoice to the cashier for payment. |
| Alternative Sequences/Flows | A1 - Order not invoiceable: CANCELLED/CLOSED order, or an invoice already exists for it → rejected.<br>A2 - Items not ready: some items are still PENDING/COOKING → rejected until all payable items are READY/SERVED.<br>A3 - Invalid promotion: code not found, expired, outside valid dates, or usage limit reached → rejected; invoice can still be generated without a promotion.<br>A4 - No payable items or non-positive subtotal → rejected. |

### 2.1.2 UC-PM-02 — List Invoices

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Manager; Administrator |
| Secondary Actors | None |
| Description | As a cashier/manager, I want to search and filter invoices so that I can find a specific bill. |
| Preconditions | - User is authenticated with CASHIER/MANAGER/ADMIN role. |
| Postconditions | - A filtered, read-only list of invoices (by paid flag, order, status) is returned; no data is changed. |
| Normal Sequence/Flow | Step 1 - User opens the invoice list, optionally entering filters (paid, orderId/code, status).<br>Step 2 - The system parses the filters and queries matching invoices.<br>Step 3 - The system returns the list; when no status filter is given, all statuses (ACTIVE/MERGED/SPLIT) are included. |
| Alternative Sequences/Flows | A1 - An invalid status filter value is supplied → request rejected with a clear error instead of a generic failure.<br>A2 - The orderId filter is a business code that does not resolve to a real order → an empty result is returned, not an error. |

### 2.1.3 UC-PM-03 — View Invoice Detail

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Manager; Administrator |
| Secondary Actors | None |
| Description | As a cashier/manager, I want to view an invoice's full detail so that I can verify its items, amounts, and split/merge lineage before taking further action. |
| Preconditions | - The invoice exists. |
| Postconditions | - No state change; the invoice's line items, promotion, and split/merge lineage are returned. |
| Normal Sequence/Flow | Step 1 - User selects an invoice from the list.<br>Step 2 - The system loads the invoice and resolves its allocation lines, promotion code, and creator.<br>Step 3 - If the invoice is a split source, the system includes its split children; if it is ACTIVE, it includes any merge sources.<br>Step 4 - The system returns the full invoice detail. |
| Alternative Sequences/Flows | A1 - Invoice not found → error returned.<br>A2 - Allocation-data inconsistency detected → error surfaced instead of silently showing incorrect amounts. |

### 2.1.4 UC-PM-04 — Apply Promotion Discount to Invoice

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Administrator |
| Secondary Actors | None |
| Description | As a cashier, I want to apply a promotion code to an unpaid invoice so that the guest receives the discount before paying. |
| Preconditions | - Invoice is ACTIVE, unpaid, and has no payment history.<br>- Invoice currently has no promotion applied (a different promotion cannot be swapped in once one is set).<br>- Promotion code exists, is active, within its valid date range, and has remaining usage.<br>- Order is not CLOSED/CANCELLED. |
| Postconditions | - Invoice's promotion, discountAmount, and totalAmount are updated and saved.<br>- The promotion's usedCount is incremented. |
| Normal Sequence/Flow | Step 1 - Cashier enters a promotion code on an unpaid invoice.<br>Step 2 - The system locks the order and invoice, then validates eligibility and the promotion.<br>Step 3 - The system computes the discount (percentage or fixed amount, capped at the subtotal) and updates the invoice.<br>Step 4 - The system returns the updated invoice with its new total. |
| Alternative Sequences/Flows | A1 - Invoice ineligible: paid, has payment history, or its order is closed/cancelled → rejected.<br>A2 - A different promotion is already applied → rejected (there is no "remove discount" action; a fresh invoice must be generated instead).<br>A3 - Promotion invalid: not found, expired, outside its valid dates, or usage limit reached → rejected. |

### 2.1.5 UC-PM-05 — Process Cash Payment

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier |
| Secondary Actors | None |
| Description | As a cashier, I want to record a cash payment for an invoice so that the order is settled and the correct change is calculated. |
| Preconditions | - Cashier has an OPEN cash shift (when shift-closing is required).<br>- Invoice is ACTIVE, unpaid, has no PAID payment yet, and has no other conflicting pending payment attempt.<br>- Order is not CANCELLED/CLOSED; invoice subtotal/discount/total are internally consistent.<br>- The received cash amount is ≥ the invoice total. |
| Postconditions | - A PAID Payment record (method = CASH) is created with amount, receivedAmount and changeAmount, attributed to the cashier's open shift.<br>- The invoice is marked paid.<br>- A cashbook receipt voucher is automatically created for the collected cash. |
| Normal Sequence/Flow | Step 1 - Cashier selects "Cash Payment" on an unpaid invoice and enters the amount received.<br>Step 2 - The system validates the shift, invoice state, and received amount.<br>Step 3 - The system creates the PAID payment, marks the invoice paid, and auto-generates the cashbook receipt voucher.<br>Step 4 - The system returns the payment confirmation, including the change to give back. |
| Alternative Sequences/Flows | A1 - No open shift → rejected; cashier must open a shift first.<br>A2 - Invoice already paid, not payable, or its order is not payable → rejected.<br>A3 - Received amount is less than the invoice total → rejected.<br>A4 - A conflicting pending payment attempt (e.g. an unexpired QR/VNPAY attempt on the same invoice) exists → rejected until it is cancelled or expires. |

### 2.1.6 UC-PM-06 — Process QR Payment

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier |
| Secondary Actors | Simulated QR payment gateway |
| Description | As a cashier, I want to initiate a QR payment and then confirm or cancel it so that a guest can pay by scanning a code. |
| Preconditions | - Initiate: same shift-open and invoice-eligibility preconditions as Cash Payment (UC-PM-05).<br>- Confirm/Cancel: a PENDING QR payment already exists for the invoice/paymentId. |
| Postconditions | - Initiate: a PENDING QR payment is created (or an existing unexpired one is reused), with a 15-minute expiry window; invoice untouched.<br>- Confirm: payment becomes PAID, invoice is marked paid, receipt voucher is created.<br>- Cancel: payment becomes CANCELLED; invoice stays unpaid so the cashier can retry with another method. |
| Normal Sequence/Flow | Step 1 - Cashier initiates a QR payment for an unpaid invoice; the system creates or reuses a PENDING QR payment.<br>Step 2 - The guest scans and pays (simulated); the cashier confirms success.<br>Step 3 - The system validates the payment is still PENDING and the invoice is still payable, marks the payment PAID, marks the invoice paid, and creates the receipt voucher. |
| Alternative Sequences/Flows | A1 - Invoice not eligible when initiating (already paid/not payable/no open shift) → rejected.<br>A2 - Cashier cancels instead of confirming → payment set to CANCELLED, invoice stays unpaid.<br>A3 - Confirm is attempted on a payment that is not QR or is no longer PENDING (already confirmed/cancelled, or wrong method) → rejected. |

### 2.1.7 UC-PM-07 — Process VNPAY Payment

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier |
| Secondary Actors | VNPAY payment gateway |
| Description | As a cashier, I want to create a VNPAY payment link for an invoice and have the system settle it automatically (or reconcile it manually) so that online bank/card payments are recorded correctly. |
| Preconditions | - Create: the VNPAY gateway is configured; invoice is eligible (ACTIVE, unpaid, no conflicting pending attempt); cashier's shift is open.<br>- Settlement (IPN/return/reconcile): a VNPAY payment exists, typically in PENDING state. |
| Postconditions | - Create: a PENDING VNPAY payment is created (or an unexpired one reused) and a signed pay URL is returned.<br>- Settle (via IPN or QueryDR reconcile — the only paths allowed to mark PAID): payment becomes PAID, invoice is marked paid, receipt voucher is created.<br>- Verified failure (via return, IPN, or reconcile): payment becomes CANCELLED/EXPIRED/FAILED as reported by the gateway; invoice remains unpaid. |
| Normal Sequence/Flow | Step 1 - Cashier creates a VNPAY payment link for an unpaid invoice; the guest is redirected to pay.<br>Step 2 - VNPAY sends an IPN webhook once the guest completes payment; the system verifies the signature and amount, then settles the payment as PAID and marks the invoice paid.<br>Step 3 - The cashier/system may query the current status of a VNPAY payment at any time, or trigger a manual reconciliation (QueryDR) if the IPN was never received. |
| Alternative Sequences/Flows | A1 - Gateway not configured → payment creation rejected.<br>A2 - Guest cancels, or the payment window expires → gateway reports a terminal failure; payment set to CANCELLED/EXPIRED, invoice stays unpaid.<br>A3 - IPN signature or amount is invalid, or references an unknown/mismatched payment → rejected/ignored, invoice state unchanged.<br>A4 - A duplicate IPN delivery arrives for an already-settled payment → acknowledged idempotently, no double-processing.<br>A5 - Reconciliation is run on a payment already in a terminal state → short-circuits and returns the current status with no side effects. |

### 2.1.8 UC-PM-08 — Split Invoice

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Administrator |
| Secondary Actors | None |
| Description | As a cashier, I want to move selected item quantities into child invoices so that one order can be settled separately without creating or losing quantity or value. |
| Preconditions | - The source invoice is ACTIVE, unpaid, belongs to a non-final (not CLOSED/CANCELLED) order, and has no payment history at all.<br>- The source has no promotion/discount; its subtotal and total are equal and positive.<br>- At least two allocated units exist in total, and every active allocation is valid and payable. |
| Postconditions | - Each requested group becomes one unpaid ACTIVE child invoice linked by `splitFromInvoiceId`.<br>- The source remains ACTIVE with at least one retained unit and its subtotal/total reduced to the retained value.<br>- The source remainder plus all children exactly equals the original quantity and monetary value. |
| Normal Sequence/Flow | Step 1 - The cashier chooses Split Invoice for an eligible invoice.<br>Step 2 - The system displays allocation-backed item quantities and the cashier assigns quantities to one or more child groups.<br>Step 3 - The system validates positive whole quantities, unique selections per group, and that requested totals do not exceed available units.<br>Step 4 - The backend locks the order, source invoice, allocations and order items in a deterministic transaction.<br>Step 5 - The system creates child invoices and allocations, reduces/removes source allocations as required, and retains at least one source unit.<br>Step 6 - The system verifies quantity and value conservation, then refreshes the invoice list and selects a resulting invoice. |
| Alternative Sequences/Flows | A1 - Ineligible lifecycle: a paid, historical, CLOSED/CANCELLED-order, or payment-history invoice cannot be split.<br>A2 - Discounted invoice: an invoice with a promotion or non-zero discount cannot be split.<br>A3 - Invalid selection: empty groups, duplicate selections, non-positive quantities, over-allocation, or moving every source unit are rejected.<br>A4 - Concurrent mutation: if eligibility changes while the modal is open, the transaction is rejected and the UI refreshes to the current invoice state. |

### 2.1.9 UC-PM-09 — Merge Invoices

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Administrator |
| Secondary Actors | None |
| Description | As a cashier, I want to merge multiple unpaid invoices from the same order into one so that a guest can pay a single combined bill instead of several separate ones. |
| Preconditions | - Between 2 and 100 distinct invoice ids are provided, all belonging to the same order.<br>- Every source invoice is ACTIVE, unpaid, has no payment history, carries no promotion/discount, and is not already merged.<br>- The order is not CLOSED/CANCELLED.<br>- Each source's allocation data is internally consistent (its recomputed subtotal matches its stored subtotal). |
| Postconditions | - A new ACTIVE, unpaid target invoice is created combining all sources' items (allocations for the same order item across sources are summed into one target row).<br>- Every source invoice is marked MERGED with `mergedIntoInvoiceId` pointing to the target; its allocations are deactivated.<br>- The target's subtotal/total equal the sum of all sources' subtotal/total. |
| Normal Sequence/Flow | Step 1 - The cashier selects 2 or more unpaid invoices belonging to the same order and chooses "Merge".<br>Step 2 - The system locks the order and all source invoices, then validates eligibility.<br>Step 3 - The system creates the target invoice, combines the allocations, and marks all sources as MERGED.<br>Step 4 - The system returns the target invoice for payment. |
| Alternative Sequences/Flows | A1 - Fewer than 2 or more than 100 ids, duplicate ids, or ids spanning different orders → rejected.<br>A2 - Any source is paid, has payment history, is already merged, or carries a discount → rejected.<br>A3 - The order is closed/cancelled → rejected.<br>A4 - An allocation/financial inconsistency is detected in any source → rejected. |

### 2.1.10 UC-PM-10 — Send Invoice by Email

| Field | Nội dung |
|---|---|
| Primary Actors | Cashier; Manager; Administrator |
| Secondary Actors | Mail server (SMTP) |
| Description | As a cashier, I want to email an invoice to the guest so that they have a receipt of their order. |
| Preconditions | - The invoice exists and its order has a customer email on file.<br>- Outgoing mail is configured on the server. |
| Postconditions | - The invoice is emailed synchronously to the customer with its line items, subtotal/discount/total, paid flag, and payment method (if paid).<br>- No Invoice/Payment data is changed; a `sentAt` timestamp is returned to the caller. |
| Normal Sequence/Flow | Step 1 - User selects "Send Invoice" for an invoice.<br>Step 2 - The system checks that the order has an email on file and that mail is configured.<br>Step 3 - The system sends the email synchronously and reports the real delivery outcome. |
| Alternative Sequences/Flows | A1 - No customer email on file → rejected; user must add an email first.<br>A2 - Mail server not configured → rejected with a clear configuration error.<br>A3 - Mail server rejects or fails delivery → rejected; the cashier is told delivery failed rather than a false "success". |
