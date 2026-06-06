import React, { useState, useEffect } from "react";
import liff from "@line/liff";
import "./styles.css"; // 確保你的 CodeSandbox 內有這個檔案

export default function App() {
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);

  // 1. 初始化 LIFF
  useEffect(() => {
    // ⚠️ 之後這裡要填入你在 LINE Developers 申請到的 LIFF ID
    const myLiffId = "2010313868-5aQ7LjIm";

    liff
      .init({ liffId: myLiffId })
      .then(() => {
        if (liff.isLoggedIn()) {
          liff.getProfile().then((p) => setProfile(p));
        } else {
          // 在本機開發時如果沒登入，暫不強制跳轉，方便看畫面
          console.log("未登入 LINE");
        }
      })
      .catch((err) => console.error("LIFF 初始化失敗", err));
  }, []);

  // 2. 菜單資料庫 (四個核心分類)
  const menuData = [
    {
      id: "C1",
      category: "咖啡",
      name: "基地經典冰拿鐵",
      price: 80,
      desc: "底子好，隨便沖都好喝",
    },
    {
      id: "T1",
      category: "茶飲",
      name: "在地小農高山青",
      price: 40,
      desc: "順口回甘，解渴首選",
    },
    {
      id: "S1",
      category: "小點",
      name: "手工焦糖烤布丁",
      price: 60,
      desc: "綿密滑順的日常療癒",
    },
    {
      id: "M1",
      category: "餐食",
      name: "舒肥雞胸義大利麵",
      price: 150,
      desc: "高蛋白無添加，健康飽足",
    },
  ];

  // 3. 加入購物車邏輯
  const addToCart = (item) => {
    setCart([...cart, item]);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  // 4. 結帳送單邏輯 (對接 Apps Script)
  const handleCheckout = () => {
    if (cart.length === 0) return alert("購物車還是空的喔！");

    const orderData = {
      orderId: `ORD-${Date.now().toString().slice(-6)}`,
      orderTime: new Date().toLocaleString("zh-TW"),
      customerName: profile ? profile.displayName : "吧台熟客",
      items: cart.map((c) => c.name).join(", "),
      totalAmount: totalAmount,
      paymentMethod: "現場付款",
      memo: "LINE LIFF 點餐測試",
    };

    // ⚠️ 這裡要換成你 Apps Script 剛才發布的「網頁應用程式 URL」
    const scriptUrl =
      "https://script.google.com/macros/s/AKfycbyYWoLRqeJRFRvcgsRrDBsa_iXW97hrOXTVDbJ6G__98112r_xyu4u3-4zqMDZ1dj99/exec";

    // 傳送資料到 Google Sheet，然後透過 LINE 官方帳號通知
    fetch(scriptUrl, {
      method: "POST",
      body: JSON.stringify(orderData),
    })
      .then((response) => response.text())
      .then((result) => {
        alert("訂單已送出，吧台準備中！☕️");
        setCart([]); // 清空購物車
        if (liff.isInClient()) {
          liff.closeWindow(); // 若在 LINE 內開啟，送單後自動關閉畫面
        }
      })
      .catch((error) => alert("傳送失敗，請稍後再試。"));
  };

  return (
    <div
      style={{
        backgroundColor: "#EDE6D4",
        minHeight: "100vh",
        color: "#1A2F42",
        fontFamily: "sans-serif",
        padding: "20px",
      }}
    >
      {/* 頭部歡迎區塊 */}
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
            : "國際標準的風味，日常實惠的享受"}
        </p>
      </header>

      {/* 菜單展示區 */}
      <main>
        {["茶飲", "咖啡", "小點", "餐食"].map((category) => (
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
            {menuData
              .filter((item) => item.category === category)
              .map((item) => (
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
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#604E3F",
                        marginTop: "4px",
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
                      onClick={() => addToCart(item)}
                      style={{
                        backgroundColor: "#659157",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        fontSize: "18px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </main>

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
            alignItems: "center",
            boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <div>已選擇 {cart.length} 項商品</div>
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
                cursor: "pointer",
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
