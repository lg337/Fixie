import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fixieColors, fixieShadows } from "../../lib/fixie-theme";
import { supabase } from "../../lib/supabase";
import useFixieLayout from "../../lib/useFixieLayout";
import CompanyBottomNav from "./components/CompanyBottomNav";

const EMPTY_ACCOUNT = { bankName: "", accountName: "", last4: "", balance: "" };
const EMPTY_ENTRY = { type: "income", amount: "", label: "" };

const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CompanyFinance() {
  const layout = useFixieLayout();
  const [loading, setLoading] = useState(true);
  const [companyID, setCompanyID] = useState(null);
  const [companyName, setCompanyName] = useState("Company");
  const [employees, setEmployees] = useState([]);
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [transactions, setTransactions] = useState([]);
  const [accountModal, setAccountModal] = useState(false);
  const [entryModal, setEntryModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [accountDraft, setAccountDraft] = useState(EMPTY_ACCOUNT);
  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [payeeID, setPayeeID] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  const storageKey = useCallback((id) => `companyFinance:${id}`, []);

  const loadFinance = useCallback(async () => {
    try {
      setLoading(true);
      const storedID = await AsyncStorage.getItem("companyID");
      if (!storedID) {
        router.replace("/company/login");
        return;
      }
      setCompanyID(storedID);

      if (storedID === "demo") {
        setCompanyName("Demo Company");
        setEmployees([{ EmployeeID: 1, EmployeeName: "Alex Morgan" }, { EmployeeID: 2, EmployeeName: "Jordan Lee" }]);
        const savedDemo = await AsyncStorage.getItem(storageKey(storedID));
        if (savedDemo) {
          const parsed = JSON.parse(savedDemo);
          setAccount(parsed.account || EMPTY_ACCOUNT);
          setTransactions(parsed.transactions || []);
        } else {
          setAccount({ bankName: "Fixie Demo Bank", accountName: "Operating", last4: "4821", balance: "18640" });
          setTransactions([
            { id: 1, type: "income", amount: 4200, label: "Kitchen repair project", date: new Date().toISOString(), status: "recorded" },
            { id: 2, type: "expense", amount: 860, label: "Materials", date: new Date(Date.now() - 86400000).toISOString(), status: "recorded" },
            { id: 3, type: "payroll", amount: 1200, label: "Alex Morgan", note: "Weekly payroll", date: new Date(Date.now() - 172800000).toISOString(), status: "recorded" },
          ]);
        }
        return;
      }

      const parsedID = Number(storedID);
      const [companyResult, employeeResult, saved] = await Promise.all([
        supabase.from("CompanyTable").select("CompanyName").eq("CompanyID", parsedID).maybeSingle(),
        supabase.from("EmployeeTable").select("EmployeeID, EmployeeName").contains("CompanyIDS", [parsedID]).order("EmployeeName", { ascending: true }),
        AsyncStorage.getItem(storageKey(storedID)),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (employeeResult.error) throw employeeResult.error;
      setCompanyName(companyResult.data?.CompanyName || "Company");
      setEmployees(employeeResult.data || []);
      if (saved) {
        const parsed = JSON.parse(saved);
        setAccount(parsed.account || EMPTY_ACCOUNT);
        setTransactions(parsed.transactions || []);
      }
    } catch (error) {
      Alert.alert("Could not load finances", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useFocusEffect(useCallback(() => { loadFinance(); }, [loadFinance]));

  const persist = async (nextAccount, nextTransactions) => {
    await AsyncStorage.setItem(storageKey(companyID), JSON.stringify({ account: nextAccount, transactions: nextTransactions }));
    setAccount(nextAccount);
    setTransactions(nextTransactions);
  };

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = transactions.filter((item) => item.type !== "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const payroll = transactions.filter((item) => item.type === "payroll").reduce((sum, item) => sum + Number(item.amount), 0);
    const incomeEntries = transactions.filter((item) => item.type === "income");
    return { income, expenses, payroll, profit: income - expenses, average: incomeEntries.length ? income / incomeEntries.length : 0 };
  }, [transactions]);

  const saveAccount = async () => {
    if (!accountDraft.bankName.trim() || !accountDraft.last4.trim()) {
      Alert.alert("Missing account details", "Enter a bank name and the last four account digits.");
      return;
    }
    await persist({ ...accountDraft, last4: accountDraft.last4.replace(/\D/g, "").slice(-4) }, transactions);
    setAccountModal(false);
  };

  const addEntry = async () => {
    const amount = Number(entry.amount);
    if (!amount || amount <= 0 || !entry.label.trim()) {
      Alert.alert("Check the entry", "Add a description and an amount greater than zero.");
      return;
    }
    const next = [{ id: Date.now(), ...entry, amount, label: entry.label.trim(), date: new Date().toISOString(), status: "recorded" }, ...transactions];
    await persist(account, next);
    setEntry(EMPTY_ENTRY);
    setEntryModal(false);
  };

  const recordPayroll = async () => {
    const employee = employees.find((item) => String(item.EmployeeID) === String(payeeID));
    const amount = Number(payAmount);
    if (!employee || !amount || amount <= 0) {
      Alert.alert("Check payment details", "Choose an employee and enter an amount greater than zero.");
      return;
    }
    const next = [{
      id: Date.now(),
      type: "payroll",
      amount,
      label: employee.EmployeeName || "Employee",
      note: payNote.trim() || "Employee payment",
      employeeID: employee.EmployeeID,
      date: new Date().toISOString(),
      status: "recorded",
    }, ...transactions];
    await persist(account, next);
    setPayeeID(null);
    setPayAmount("");
    setPayNote("");
    setPayModal(false);
    Alert.alert("Payment recorded", "No money was transferred. Connect a payment provider before enabling real payouts.");
  };

  if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color={fixieColors.gold} style={styles.loader} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, layout.isDesktop && styles.desktopContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MONEY MANAGEMENT</Text>
            <Text style={styles.title}>
              <Text dataSet={{ fixieNoTranslate: "true" }}>{companyName}</Text>
              <Text> finances</Text>
            </Text>
            <Text style={styles.subtitle}>Track cash flow, understand performance, and manage employee payroll.</Text>
          </View>
          <TouchableOpacity style={styles.headerIcon} onPress={() => { setAccountDraft(account); setAccountModal(true); }}><Ionicons name="settings-outline" size={23} color={fixieColors.goldLight} /></TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceGlow} />
          <View style={styles.balanceTop}>
            <View><Text style={styles.balanceLabel}>ACCOUNT BALANCE</Text><Text style={styles.balanceAmount}>{account.bankName ? money(account.balance) : "—"}</Text></View>
            <View style={styles.bankIcon}><Ionicons name="business-outline" size={25} color={fixieColors.background} /></View>
          </View>
          <View style={styles.balanceFooter}>
            <View><Text style={styles.accountName}>{account.accountName || "No account added"}</Text><Text style={styles.accountMeta}>{account.bankName ? `${account.bankName} •••• ${account.last4}` : "Add an account to begin"}</Text></View>
            <TouchableOpacity style={styles.accountButton} onPress={() => { setAccountDraft(account); setAccountModal(true); }}><Text style={styles.accountButtonText}>{account.bankName ? "Manage" : "Add account"}</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.safetyNotice}><Ionicons name="information-circle-outline" size={20} color={fixieColors.goldLight} /><Text style={styles.safetyText}>Financial records are currently planning tools. Bank syncing and real money movement require a secure payment-provider integration.</Text></View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryAction} onPress={() => setPayModal(true)}><Ionicons name="paper-plane-outline" size={19} color={fixieColors.background} /><Text style={styles.primaryActionText}>Pay employee</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => setEntryModal(true)}><Ionicons name="add-circle-outline" size={19} color={fixieColors.goldLight} /><Text style={styles.secondaryActionText}>Add transaction</Text></TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Business insights</Text>
        <View style={styles.insightGrid}>
          <Insight icon="trending-up-outline" label="Total income" value={money(totals.income)} color={fixieColors.success} />
          <Insight icon="trending-down-outline" label="Total expenses" value={money(totals.expenses)} color={fixieColors.error} />
          <Insight icon="analytics-outline" label="Net profit" value={money(totals.profit)} color={totals.profit >= 0 ? fixieColors.goldLight : fixieColors.error} />
          <Insight icon="calculator-outline" label="Average income" value={money(totals.average)} color={fixieColors.info} />
        </View>

        <View style={styles.payrollCard}>
          <View><Text style={styles.cardEyebrow}>EMPLOYEE PAYROLL</Text><Text style={styles.payrollAmount}>{money(totals.payroll)}</Text><Text style={styles.cardMeta}>Total recorded employee payments</Text></View>
          <View style={styles.employeeCount}><Text style={styles.employeeCountValue}>{employees.length}</Text><Text style={styles.employeeCountLabel}>employees</Text></View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.sectionMeta}>
            <Text dataSet={{ fixieNoTranslate: "true" }}>{transactions.length}</Text>
            <Text> records</Text>
          </Text>
        </View>
        <View style={styles.activityCard}>
          {!transactions.length ? <View style={styles.empty}><Ionicons name="receipt-outline" size={30} color={fixieColors.goldLight} /><Text style={styles.emptyTitle}>No financial activity yet</Text><Text style={styles.emptyText}>Record income, expenses, or payroll to build your insights.</Text></View> :
            transactions.map((item) => (
              <View key={item.id} style={styles.transaction}>
                <View style={[styles.transactionIcon, item.type === "income" ? styles.incomeIcon : styles.expenseIcon]}><Ionicons name={item.type === "income" ? "arrow-down" : item.type === "payroll" ? "person-outline" : "arrow-up"} size={17} color={item.type === "income" ? fixieColors.success : fixieColors.error} /></View>
                <View style={styles.transactionCopy}><Text style={styles.transactionLabel}>{item.label}</Text><Text style={styles.transactionMeta}>{new Date(item.date).toLocaleDateString()} · {item.type === "payroll" ? "Payroll recorded" : item.type}</Text>{item.note ? <Text style={styles.transactionNote}>{item.note}</Text> : null}</View>
                <Text style={[styles.transactionAmount, item.type === "income" && styles.incomeAmount]}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</Text>
              </View>
            ))}
        </View>
      </ScrollView>
      <CompanyBottomNav />

      <FinanceModal visible={accountModal} title="Bank account details" onClose={() => setAccountModal(false)}>
        <Field label="Bank name" value={accountDraft.bankName} onChangeText={(bankName) => setAccountDraft({ ...accountDraft, bankName })} placeholder="Bank name" />
        <Field label="Account nickname" value={accountDraft.accountName} onChangeText={(accountName) => setAccountDraft({ ...accountDraft, accountName })} placeholder="Operating account" />
        <Field label="Last four digits" value={accountDraft.last4} onChangeText={(last4) => setAccountDraft({ ...accountDraft, last4 })} placeholder="1234" keyboardType="number-pad" />
        <Field label="Current balance" value={String(accountDraft.balance)} onChangeText={(balance) => setAccountDraft({ ...accountDraft, balance })} placeholder="0.00" keyboardType="decimal-pad" />
        <ModalButton label="Save account" onPress={saveAccount} />
      </FinanceModal>

      <FinanceModal visible={entryModal} title="Add transaction" onClose={() => setEntryModal(false)}>
        <View style={styles.typeRow}>{["income", "expense"].map((type) => <TouchableOpacity key={type} style={[styles.typeChip, entry.type === type && styles.typeChipActive]} onPress={() => setEntry({ ...entry, type })}><Text style={[styles.typeChipText, entry.type === type && styles.typeChipTextActive]}>{type === "income" ? "Income" : "Expense"}</Text></TouchableOpacity>)}</View>
        <Field label="Description" value={entry.label} onChangeText={(label) => setEntry({ ...entry, label })} placeholder="Project payment or expense" />
        <Field label="Amount" value={entry.amount} onChangeText={(amount) => setEntry({ ...entry, amount })} placeholder="0.00" keyboardType="decimal-pad" />
        <ModalButton label="Record transaction" onPress={addEntry} />
      </FinanceModal>

      <FinanceModal visible={payModal} title="Record employee payment" onClose={() => setPayModal(false)}>
        <Text style={styles.modalHint}>This creates a payroll record only. It does not transfer money.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.employeeOptions}>
          {employees.map((employee) => <TouchableOpacity key={employee.EmployeeID} style={[styles.employeeChip, String(payeeID) === String(employee.EmployeeID) && styles.employeeChipActive]} onPress={() => setPayeeID(employee.EmployeeID)}><Text style={[styles.employeeChipText, String(payeeID) === String(employee.EmployeeID) && styles.employeeChipTextActive]}>{employee.EmployeeName || "Employee"}</Text></TouchableOpacity>)}
        </ScrollView>
        {!employees.length ? <Text style={styles.modalHint}>Add employees before recording payroll.</Text> : null}
        <Field label="Amount" value={payAmount} onChangeText={setPayAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Field label="Memo" value={payNote} onChangeText={setPayNote} placeholder="Weekly payroll or project bonus" />
        <ModalButton label="Record payment" onPress={recordPayroll} />
      </FinanceModal>
    </SafeAreaView>
  );
}

function Insight({ icon, label, value, color }) {
  return <View style={styles.insightCard}><Ionicons name={icon} size={19} color={color} /><Text style={styles.insightLabel}>{label}</Text><Text style={styles.insightValue}>{value}</Text></View>;
}
function Field({ label, ...props }) {
  return <View><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} placeholderTextColor={fixieColors.textMuted} {...props} /></View>;
}
function ModalButton({ label, onPress }) {
  return <TouchableOpacity style={styles.modalButton} onPress={onPress}><Text style={styles.modalButtonText}>{label}</Text></TouchableOpacity>;
}
function FinanceModal({ visible, title, onClose, children }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={23} color={fixieColors.text} /></TouchableOpacity></View>{children}</View></View></Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fixieColors.background }, loader: { marginTop: 48 },
  content: { padding: 16, paddingBottom: 28 }, desktopContent: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }, eyebrow: { color: fixieColors.goldLight, fontSize: 11, fontWeight: "800", letterSpacing: 1.3 }, title: { color: fixieColors.text, fontSize: 28, fontWeight: "900", marginTop: 4 }, subtitle: { color: fixieColors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 }, headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", justifyContent: "center" },
  balanceCard: { backgroundColor: fixieColors.goldDeep, borderRadius: 24, padding: 20, overflow: "hidden", ...fixieShadows.glow }, balanceGlow: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(255,255,255,0.08)", right: -45, top: -90 }, balanceTop: { flexDirection: "row", justifyContent: "space-between" }, balanceLabel: { color: "rgba(0,0,0,0.58)", fontSize: 10, fontWeight: "900", letterSpacing: 1 }, balanceAmount: { color: fixieColors.background, fontSize: 36, fontWeight: "900", marginTop: 3 }, bankIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.14)", alignItems: "center", justifyContent: "center" }, balanceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.15)", marginTop: 16, paddingTop: 14 }, accountName: { color: fixieColors.background, fontSize: 13, fontWeight: "900" }, accountMeta: { color: "rgba(0,0,0,0.58)", fontSize: 10, marginTop: 3 }, accountButton: { backgroundColor: "rgba(0,0,0,0.14)", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 }, accountButtonText: { color: fixieColors.background, fontSize: 11, fontWeight: "900" },
  safetyNotice: { flexDirection: "row", gap: 9, backgroundColor: "rgba(216,198,144,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(216,198,144,0.2)", padding: 13, marginTop: 12 }, safetyText: { flex: 1, color: fixieColors.textSecondary, fontSize: 10, lineHeight: 16 },
  actionRow: { flexDirection: "row", gap: 10, marginVertical: 16 }, primaryAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: fixieColors.gold, borderRadius: 15, paddingVertical: 14 }, primaryActionText: { color: fixieColors.background, fontWeight: "900", fontSize: 12 }, secondaryAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: fixieColors.surface, borderWidth: 1, borderColor: fixieColors.border, borderRadius: 15, paddingVertical: 14 }, secondaryActionText: { color: fixieColors.goldLight, fontWeight: "900", fontSize: 12 },
  sectionTitle: { color: fixieColors.text, fontSize: 18, fontWeight: "900", marginBottom: 10 }, insightGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, insightCard: { width: "48%", backgroundColor: fixieColors.surface, borderRadius: 18, borderWidth: 1, borderColor: fixieColors.border, padding: 14, ...fixieShadows.card }, insightLabel: { color: fixieColors.textMuted, fontSize: 10, marginTop: 9 }, insightValue: { color: fixieColors.text, fontSize: 19, fontWeight: "900", marginTop: 3 },
  payrollCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: fixieColors.surface, borderRadius: 20, borderWidth: 1, borderColor: fixieColors.border, padding: 17, marginTop: 14 }, cardEyebrow: { color: fixieColors.textMuted, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, payrollAmount: { color: fixieColors.goldLight, fontSize: 25, fontWeight: "900", marginTop: 4 }, cardMeta: { color: fixieColors.textMuted, fontSize: 10, marginTop: 3 }, employeeCount: { alignItems: "center", backgroundColor: fixieColors.surfaceElevated, borderRadius: 15, paddingHorizontal: 15, paddingVertical: 10 }, employeeCountValue: { color: fixieColors.text, fontSize: 19, fontWeight: "900" }, employeeCountLabel: { color: fixieColors.textMuted, fontSize: 9 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22 }, sectionMeta: { color: fixieColors.textMuted, fontSize: 10 }, activityCard: { backgroundColor: fixieColors.surface, borderRadius: 20, borderWidth: 1, borderColor: fixieColors.border, paddingHorizontal: 14 }, transaction: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: fixieColors.border }, transactionIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" }, incomeIcon: { backgroundColor: "rgba(88,183,122,0.12)" }, expenseIcon: { backgroundColor: "rgba(214,106,95,0.12)" }, transactionCopy: { flex: 1, marginLeft: 10 }, transactionLabel: { color: fixieColors.text, fontSize: 13, fontWeight: "800" }, transactionMeta: { color: fixieColors.textMuted, fontSize: 9, marginTop: 3, textTransform: "capitalize" }, transactionNote: { color: fixieColors.textSecondary, fontSize: 9, marginTop: 2 }, transactionAmount: { color: fixieColors.error, fontSize: 13, fontWeight: "900" }, incomeAmount: { color: fixieColors.success },
  empty: { alignItems: "center", paddingVertical: 26 }, emptyTitle: { color: fixieColors.text, fontSize: 14, fontWeight: "800", marginTop: 8 }, emptyText: { color: fixieColors.textMuted, fontSize: 10, marginTop: 4, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: fixieColors.overlay, justifyContent: "flex-end" }, modalCard: { backgroundColor: fixieColors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: fixieColors.border, padding: 20, paddingBottom: 30 }, modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }, modalTitle: { color: fixieColors.text, fontSize: 20, fontWeight: "900" }, modalHint: { color: fixieColors.textMuted, fontSize: 10, lineHeight: 16, marginBottom: 12 }, fieldLabel: { color: fixieColors.textSecondary, fontSize: 11, fontWeight: "800", marginBottom: 7 }, input: { backgroundColor: fixieColors.backgroundAlt, borderRadius: 14, borderWidth: 1, borderColor: fixieColors.border, color: fixieColors.text, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 14 }, modalButton: { backgroundColor: fixieColors.gold, borderRadius: 15, paddingVertical: 14, alignItems: "center" }, modalButtonText: { color: fixieColors.background, fontWeight: "900" },
  typeRow: { flexDirection: "row", gap: 9, marginBottom: 15 }, typeChip: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: fixieColors.border, alignItems: "center", paddingVertical: 11 }, typeChipActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.gold }, typeChipText: { color: fixieColors.textSecondary, fontWeight: "800" }, typeChipTextActive: { color: fixieColors.background }, employeeOptions: { gap: 8, paddingBottom: 15 }, employeeChip: { borderRadius: 14, borderWidth: 1, borderColor: fixieColors.border, paddingHorizontal: 12, paddingVertical: 9 }, employeeChipActive: { backgroundColor: fixieColors.gold, borderColor: fixieColors.gold }, employeeChipText: { color: fixieColors.textSecondary, fontSize: 11, fontWeight: "800" }, employeeChipTextActive: { color: fixieColors.background },
});
