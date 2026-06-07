import React, { useState, useEffect } from "react";
import liff from "@line/liff";
import "./styles.css";

interface OptionChoice {
  label: string;
  price: number;
}
interface MenuOption {
  title: string;
  type: "single" | "multiple";
  choices: OptionChoice[];
}
interface MenuItem {
  id: string;
  category: string;
  name: string;
  price: number;
  desc: string;
  options?: MenuOption[];
}
interface CartItem {
  cartId: string;
  name: string;
  price: number;
}
interface UserProfile {
  displayName: string;
}

// 解析雲端試算表文字字串的工具函式
const parseCustomOptions = (rawString: string): MenuOption[] => {
  if (!rawString || typeof rawString !== "string") return [];
  const options: MenuOption[] = [];
  const groups = rawString.split(";");
  groups.forEach((group) => {
    const parts = group.split(":");
    if (parts.length < 2) return;
    const title = parts[0].trim();
    const choicesRaw = parts[1].split(",");
    const choices: OptionChoice[] = choicesRaw.map((c) => {
      const kv = c.split("=");
      return { label: kv[0].trim(), price: kv[1] ? Number(kv[1].trim()) : 0 };
    });
    options.push({
      title: title,
      type:
        title.includes("加購") ||
        title.includes("升級") ||
        title.includes("環保")
          ? "multiple"
          : "single",
      choices: choices,
    });
  });
  return options;
};

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 🔧 專門用來顯示錯誤訊息的狀態
  const [debugMsg, setDebugMsg] = useState<string>("");

  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selectedSingle, setSelectedSingle] = useState<{
    [key: string]: OptionChoice;
  }>({});
  const [selectedMulti, setSelectedMulti] = useState<OptionChoice[]>([]);

  // 您的專屬鑰匙，我已經幫您填好了！
  const myLiffId = "2010313868-5aQ7LjIm";
  const scriptUrl =
    "https://script.google.com/macros/s/AKfycbyYWoLRqeJRFRvcgsRrDBsa_iXW97hrOXTVDbJ6G__98112r_xyu4u3-4zqMDZ1dj99/exec";

  useEffect(() => {
    liff
      .init({ liffId: myLiffId })
      .then(() => {
        if (liff.isLoggedIn()) {
          liff
            .getProfile()
            .then((p) => setProfile({ displayName: p.displayName }));
        }
      })
      .catch(console.error);

    fetch(scriptUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setDebugMsg("後台回報錯誤：" + data.error);
        } else if (Array.isArray(data)) {
          const parsedMenu = data.map((item: any) => ({
            id: item.id,
            category: String(item.category).trim(), // 消除類別的多餘空白
            name: String(item.name).trim(),
            price: Number(item.price),
            desc: item.desc,
            options: parseCustomOptions(item.rawOptions),
          }));
          setMenuData(parsedMenu);

          if (parsedMenu.length === 0) {
            setDebugMsg(
              "已成功連線到試算表，但沒有找到任何「上架」的品項，請檢查試算表第一欄是否精準輸入了「上架」兩字。"
            );
          }
        } else {
          setDebugMsg("資料格式異常，請確認 Apps Script 部署設定。");
        }
        setLoading(false);
      })
      .catch((err) => {
        setDebugMsg(
          "連線被瀏覽器阻擋 (可能是權限未開或網址錯誤)：" + err.toString()
        );
        setLoading(false);
      });
  }, []);

  const handleAddClick = (item: MenuItem) => {
    if (item.options && item.options.length > 0) {
      setActiveItem(item);
      const initialSingle: { [key: string]: OptionChoice } = {};
      item.options
        .filter((opt) => opt.type === "single")
        .forEach((opt) => {
          initialSingle[opt.title] = opt.choices[0];
        });
      setSelectedSingle(initialSingle);
      setSelectedMulti([]);
    } else {
      setCart([
        ...cart,
        { cartId: Date.now().toString(), name: item.name, price: item.price },
      ]);
    }
  };

  const confirmCustomization = () => {
    if (!activeItem) return;
    let finalPrice = activeItem.price;
    const optionLabels: string[] = [];
    Object.values(selectedSingle).forEach((choice) => {
      finalPrice += choice.price;
      optionLabels.push(choice.label);
    });
    selectedMulti.forEach((choice) => {
      finalPrice += choice.price;
      optionLabels.push(choice.label);
    });
    const finalName =
      optionLabels.length > 0
        ? `${activeItem.name} (${optionLabels.join(", ")})`
        : activeItem.name;
    setCart([
      ...cart,
      { cartId: Date.now().toString(), name: finalName, price: finalPrice },
    ]);
    setActiveItem(null);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return alert("購物車還是空的喔！");
    const orderData = {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      orderTime: new Date().toLocaleString("zh-TW"),
      customerName: profile ? profile.displayName : "吧台熟客",
      items: cart.map((c) => c.name).join("\n"),
      totalAmount: totalAmount,
      paymentMethod: "現場付款",
      memo: "LINE LIFF 雲端點餐",
    };
    fetch(scriptUrl, { method: "POST", body: JSON.stringify(orderData) })
      .then(() => {
        alert("訂單已送出，吧台準備中！☕️");
        setCart([]);
        if (liff.isInClient()) liff.closeWindow();
      })
      .catch(() => alert("傳送失敗，請稍後再試。"));
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "#EDE6D4",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1A2F42",
          fontWeight: "bold",
        }}
      >
        研磨風味中，請稍候...☕️
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#EDE6D4",
        minHeight: "100vh",
        color: "#1A2F42",
        fontFamily: "sans-serif",
        padding: "20px",
        paddingBottom: "100px",
      }}
    >
      <header
        style={{
          marginBottom: "24px",
          borderBottom: "2px solid #604E3F",
          paddingBottom: "12px",
        }}
      >
        <h1
          style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 8px 0" }}
        >
          基地咖啡
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#604E3F" }}>
          {profile
            ? `歡迎回來，${profile.displayName}`
            : "國際標準的風味科學，實惠的日常享受"}
        </p>
      </header>

      <main>
        {/* 🔧 錯誤訊息會顯示在這裡 */}
        {debugMsg && (
          <div
            style={{
              padding: "16px",
              backgroundColor: "#ffe6e6",
              color: "#d9534f",
              borderRadius: "8px",
              marginBottom: "16px",
              fontWeight: "bold",
              border: "1px solid #d9534f",
            }}
          >
            🔧 系統偵錯報告：{debugMsg}
          </div>
        )}

        {["茶飲", "咖啡", "小點", "餐食"].map((category) => {
          const categoryItems = menuData.filter(
            (item) => item.category === category
          );
          if (categoryItems.length === 0) return null;
          return (
            <div key={category} style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  borderLeft: "4px solid #1A2F42",
                  paddingLeft: "8px",
                  marginBottom: "12px",
                }}
              >
                {category}
              </h2>
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#fff",
                    padding: "12px 16px",
                    marginBottom: "8px",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#604E3F",
                        marginTop: "4px",
                        paddingRight: "10px",
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>${item.price}</span>
                    <button
                      onClick={() => handleAddClick(item)}
                      style={{
                        backgroundColor: "#659157",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        fontSize: "18px",
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </main>

      {/* 客製化彈窗 */}
      {activeItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(26,47,66,0.6)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 10,
          }}
        >
          <div
            style={{
              backgroundColor: "#EDE6D4",
              width: "100%",
              padding: "24px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: "1px solid #604E3F",
                paddingBottom: "8px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px" }}>{activeItem.name}</h3>
              <button
                onClick={() => setActiveItem(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#604E3F",
                }}
              >
                ✕
              </button>
            </div>

            {activeItem.options?.map((opt) => (
              <div key={opt.title} style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: "8px",
                    color: "#1A2F42",
                  }}
                >
                  {opt.title}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {opt.choices.map((choice) => {
                    const isSingleSelected =
                      selectedSingle[opt.title]?.label === choice.label;
                    const isMultiSelected = selectedMulti.some(
                      (c) => c.label === choice.label
                    );
                    const isSelected =
                      opt.type === "single"
                        ? isSingleSelected
                        : isMultiSelected;
                    return (
                      <button
                        key={choice.label}
                        onClick={() => {
                          if (opt.type === "single") {
                            setSelectedSingle({
                              ...selectedSingle,
                              [opt.title]: choice,
                            });
                          } else {
                            if (isMultiSelected) {
                              setSelectedMulti(
                                selectedMulti.filter(
                                  (c) => c.label !== choice.label
                                )
                              );
                            } else {
                              setSelectedMulti([...selectedMulti, choice]);
                            }
                          }
                        }}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "20px",
                          border: `1px solid ${
                            isSelected ? "#659157" : "#604E3F"
                          }`,
                          backgroundColor: isSelected
                            ? "#659157"
                            : "transparent",
                          color: isSelected ? "white" : "#1A2F42",
                          cursor: "pointer",
                        }}
                      >
                        {choice.label}{" "}
                        {choice.price !== 0
                          ? `(${choice.price > 0 ? "+" : ""}${choice.price})`
                          : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={confirmCustomization}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "12px",
                backgroundColor: "#1A2F42",
                color: "#EDE6D4",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              確認加入購物車
            </button>
          </div>
        </div>
      )}

      {/* 懸浮購物車 */}
      {cart.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#1A2F42",
            color: "#EDE6D4",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            zIndex: 5,
          }}
        >
          <div>已選擇 {cart.length} 項</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontWeight: "bold", fontSize: "18px" }}>
              總計 ${totalAmount}
            </span>
            <button
              onClick={handleCheckout}
              style={{
                backgroundColor: "#EDE6D4",
                color: "#1A2F42",
                border: "none",
                padding: "8px 16px",
                fontWeight: "bold",
                borderRadius: "4px",
              }}
            >
              結帳
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
