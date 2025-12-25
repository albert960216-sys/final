let spriteSheet;
let walkSheet;
let jumpSheet;
let pushSheet;
let projectileSheet;

let bg1, bg2, bg3, bg4;
let currentBg = 1;

let quizTable;
// Cirno 設定
let cirnoImg;
const cirnoTotalW = 187; // 精靈總寬度
const cirnoFrameH = 42;
const cirnoFrames = 6;
const spriteScale = 6; // 放大為原始的 3 倍
const makotoScale = 4; // Makoto 放大
const playerScale = 2; // 玩家放大
const helloKittyScale = 9; // Hello Kitty 放大
let cirnoFrameW = cirnoTotalW / cirnoFrames; // 每幀寬度 = 187 / 6
let cirnoActiveFrame = 0;
const cirnoFrameDelay = 8; // 幀延遲（畫面數）
let cirnoFrameCount = 0;

// Makoto 設定
let makotoImg;
const makotoTotalW = 409;
const makotoFrameH = 80;
const makotoFrames = 6;
let makotoFrameW = makotoTotalW / makotoFrames; // 409 / 6
let makotoActiveFrame = 0;
const makotoFrameDelay = 8;
let makotoFrameCount = 0;

// Hello Kitty 設定
let helloKittyImg;
const helloKittyTotalW = 145;
const helloKittyFrameH = 32;
const helloKittyFrames = 5;
let helloKittyFrameW = helloKittyTotalW / helloKittyFrames;
let helloKittyActiveFrame = 0;
const helloKittyFrameDelay = 8;
let helloKittyFrameCount = 0;

// Master 設定
let masterImg;
const masterTotalW = 420;
const masterFrameH = 98;
const masterFrames = 5;
let masterFrameW = masterTotalW / masterFrames;
let masterActiveFrame = 0;
const masterFrameDelay = 8;
let masterFrameCount = 0;
let showMaster = false;
let questionStartTime = 0;
const masterScale = 2;

// 互動狀態（分別為 Cirno / Makoto）
let activeNPC = null; // 'cirno', 'makoto', 'hellokitty'
let interactionState = 'none'; // 'none', 'questioning', 'answered'
let currentQuestion = null; // { question, answer, correct_feedback, incorrect_feedback, hint }
let isCorrect = false;
let isStageCleared = false;

let answerInput; // 用於文字輸入
let submitButton; // 用於提交答案

// 玩家角色相關變數
let lastDistToCirno = Infinity;
let lastDistToMakoto = Infinity;
let currentFrame = 0;
let frameCount = 0;
const frameDelay = 7;

let isWalking = false;
let isJumping = false;
let direction = 1; // 1 = 右, -1 = 左

let posX = 0; // 角色中心 X
let yOffset = 0; // 跳躍位移（負 = 向上）
let vy = 0;
const gravity = 0.8;
const jumpVelocity = -14;
const speed = 7;

let prevAnim = 'stop';
let prevSpace = false; // 用於 W 鍵偵測
let prevSpaceKey = false; // 用於 空白鍵偵測

let isPushing = false;
let pushTicks = 0; // 記錄 push 動畫播放的累積幀數

let projectiles = []; // 發射物陣列

function preload() {
  spriteSheet = loadImage('ryu/stop1/stop1.png');
  walkSheet = loadImage('ryu/walk/walk.png');
  jumpSheet = loadImage('ryu/jump/jump.png');
  pushSheet = loadImage('ryu/push/push.png');
  projectileSheet = loadImage('ryu/push/push--.png');
  
  bg1 = loadImage('background/Background1.png');
  bg2 = loadImage('background/Background2.png');
  bg3 = loadImage('background/Background3.png');
  bg4 = loadImage('background/Background4.png');

  // 載入 Cirno sprite（6 幀，每幀 187x42）
  cirnoImg = loadImage('cirno/cirno.png');
  // 載入 Makoto sprite（6 幀，總寬 409，高 80）
  makotoImg = loadImage('makoto/makoto.png');
  // 載入 Hello Kitty sprite
  helloKittyImg = loadImage('hellokitty/hellokitty.png');
  // 載入 Master sprite
  masterImg = loadImage('master/master.png');
  // 載入 CSV 測驗卷
  quizTable = loadTable('quiz.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  posX = width / 2;

  // 建立輸入框與按鈕，但預設為隱藏
  answerInput = createInput('');
  answerInput.hide();
  submitButton = createButton('送出');
  submitButton.hide();
}

function draw() {
  if (currentBg === 1) background(bg1);
  else if (currentBg === 2) background(bg2);
  else if (currentBg === 3) background(bg3);
  else if (currentBg === 4) background(bg4);
  else background('#8ecae6');

  // 持續偵測左右按鍵（支援長按）
  const pressingD = keyIsDown(68); // D
  const pressingA = keyIsDown(65); // A

  if (pressingD) {
    isWalking = true;
    direction = 1;
  } else if (pressingA) {
    isWalking = true;
    direction = -1;
  } else {
    isWalking = false;
  }

  // W 鍵：偵測按下事件觸發一次跳躍（若尚未在跳躍中）
  const wDown = keyIsDown(87);
  if (wDown && !prevSpace && !isJumping) {
    isJumping = true;
    vy = jumpVelocity;
    currentFrame = 0;
    frameCount = 0;
  }
  prevSpace = wDown;

  // 空白鍵：觸發 push 動作（按下觸發一次）
  const spaceDown = keyIsDown(32);
  if (spaceDown && !prevSpaceKey && !isPushing) {
    isPushing = true;
    pushTicks = 0;
    currentFrame = 0;
    frameCount = 0;
  }
  prevSpaceKey = spaceDown;

  // 水平移動（走路或跳躍期間皆可移動）
  if (pressingD) posX += speed;
  if (pressingA) posX -= speed;

  // 跳躍物理
  if (isJumping) {
    vy += gravity;
    yOffset += vy;
    if (yOffset >= 0) {
      // 回到地面
      yOffset = 0;
      vy = 0;
      isJumping = false;
    }
  }

  // 決定目前使用的動畫（jump > walk > stop）
  let anim = isPushing ? 'push' : (isJumping ? 'jump' : (isWalking ? 'walk' : 'stop'));
  if (anim !== prevAnim) {
    currentFrame = 0;
    frameCount = 0;
    prevAnim = anim;
  }

  // 更新動畫幀
  frameCount++;
  if (frameCount >= frameDelay) {
    frameCount = 0;
    if (anim === 'stop') currentFrame = (currentFrame + 1) % 10;
    else if (anim === 'walk') currentFrame = (currentFrame + 1) % 8;
    else if (anim === 'jump') currentFrame = (currentFrame + 1) % 11;
    else if (anim === 'push') currentFrame = (currentFrame + 1) % 8;
  }

  // 若正在 push，累積 ticks，當完整播放一次 push（8 幀）後生成發射物
  if (isPushing) {
    pushTicks++;
    // 每個畫面更新為一個 tick，但實際動畫幀以 frameDelay 控制
    if (pushTicks >= frameDelay * 8) {
      // 產生發射物
      spawnProjectile();
      isPushing = false;
      pushTicks = 0;
      // 切回停止或走路狀態（視當下是否按鍵）
      currentFrame = 0;
      frameCount = 0;
    }
  }

  // 根據動畫選擇圖像與幀尺寸
  let spriteImg, frameWidth, frameHeight;
  if (anim === 'stop') {
    spriteImg = spriteSheet;
    frameWidth = 1335 / 10;
    frameHeight = 180;
  } else if (anim === 'walk') {
    spriteImg = walkSheet;
    frameWidth = 827 / 8;
    frameHeight = 188;
  } else if (anim === 'jump') {
    spriteImg = jumpSheet;
    frameWidth = 1359 / 11; // 11 frames
    frameHeight = 212;
  } else if (anim === 'push') {
    spriteImg = pushSheet;
    frameWidth = 1787 / 8;
    frameHeight = 171;
  }

  // 來源 X
  let srcX = currentFrame * frameWidth;

  let displayW = frameWidth * playerScale;
  let displayH = frameHeight * playerScale;

  // 計算繪製位置：讓角色中心為 posX，垂直位置為置中加上 yOffset
  let drawX = posX - displayW / 2;
  let baseTopY = height * 0.75 - displayH / 2;
  let drawY = baseTopY + yOffset;

  // 限制角色不跑出畫面
  if (posX > width - displayW / 2) {
    if (currentBg < 3) {
      if (isStageCleared) {
        currentBg++;
        posX = displayW / 2;
        isStageCleared = false;
      } else {
        posX = width - displayW / 2;
      }
    } else if (currentBg === 3) {
      if (isStageCleared) {
        currentBg = 4;
        posX = width / 2;
      } else {
        posX = width - displayW / 2;
      }
    } else {
      posX = width - displayW / 2;
    }
  } else if (posX < displayW / 2) {
    posX = displayW / 2;
  }

  // 繪製 Cirno（每幀寬度為 187/6，位置固定於畫面右側）
  let cirnoX = width * 0.65 - (cirnoFrameW * spriteScale) / 2; // 左上角 X
  let cirnoY = height * 0.75 - (cirnoFrameH * spriteScale) / 2; // 左上角 Y

  // 來源 X（選擇 cirnoActiveFrame）
  let cirnoSrcX = cirnoActiveFrame * cirnoFrameW;
  if (currentBg === 1) {
    push();
    image(cirnoImg, cirnoX, cirnoY, cirnoFrameW * spriteScale, cirnoFrameH * spriteScale, cirnoSrcX, 0, cirnoFrameW, cirnoFrameH);
    pop();

    // Cirno 時序撥放（持續循環）
    cirnoFrameCount++;
    if (cirnoFrameCount >= cirnoFrameDelay) {
      cirnoFrameCount = 0;
      cirnoActiveFrame = (cirnoActiveFrame + 1) % cirnoFrames;
    }
  }

  // 繪製 Makoto（產生在畫面左側，使用使用者提供的定位公式）
  let makotoX = width * 0.65 - (makotoFrameW * makotoScale) / 2; // 左上角 X
  let makotoY = height * 0.75 - (makotoFrameH * makotoScale) / 2; // 左上角 Y
  let makotoSrcX = makotoActiveFrame * makotoFrameW;
  // 根據玩家位於 Makoto 左/右 決定是否鏡像（玩家在右邊則鏡像面向玩家）
  const makotoCenterX_forDraw = makotoX + (makotoFrameW * makotoScale) / 2;
  if (currentBg === 2) {
    push();
    if (posX > makotoCenterX_forDraw) {
      // 玩家在 Makoto 右邊 → 鏡像
      translate(makotoX + makotoFrameW * makotoScale, makotoY);
      scale(-1, 1);
      image(makotoImg, 0, 0, makotoFrameW * makotoScale, makotoFrameH * makotoScale, makotoSrcX, 0, makotoFrameW, makotoFrameH);
    } else {
      // 玩家在 Makoto 左邊 → 正常顯示
      image(makotoImg, makotoX, makotoY, makotoFrameW * makotoScale, makotoFrameH * makotoScale, makotoSrcX, 0, makotoFrameW, makotoFrameH);
    }
    pop();

    // Makoto 動畫循環
    makotoFrameCount++;
    if (makotoFrameCount >= makotoFrameDelay) {
      makotoFrameCount = 0;
      makotoActiveFrame = (makotoActiveFrame + 1) % makotoFrames;
    }
  }

  // 繪製 Hello Kitty (Background 3)
  let helloKittyX = width * 0.5 - (helloKittyFrameW * helloKittyScale) / 2;
  let helloKittyY = height * 0.75 - (helloKittyFrameH * helloKittyScale) / 2;
  let helloKittySrcX = helloKittyActiveFrame * helloKittyFrameW;
  
  if (currentBg === 3) {
    push();
    image(helloKittyImg, helloKittyX, helloKittyY, helloKittyFrameW * helloKittyScale, helloKittyFrameH * helloKittyScale, helloKittySrcX, 0, helloKittyFrameW, helloKittyFrameH);
    pop();

    helloKittyFrameCount++;
    if (helloKittyFrameCount >= helloKittyFrameDelay) {
      helloKittyFrameCount = 0;
      helloKittyActiveFrame = (helloKittyActiveFrame + 1) % helloKittyFrames;
    }

    if (isStageCleared) {
      push();
      textAlign(CENTER, CENTER);
      textSize(60);
      fill(255, 215, 0);
      stroke(0);
      strokeWeight(4);
      text("恭喜過關", width / 2, height / 3);
      pop();
    }
  }

  // Master 邏輯：答題超過 4 秒顯示
  if (interactionState === 'questioning' && millis() - questionStartTime > 4000) {
    showMaster = true;
  } else if (interactionState !== 'questioning') {
    showMaster = false;
  }

  if (showMaster) {
    // Master 動畫更新
    masterFrameCount++;
    if (masterFrameCount >= masterFrameDelay) {
      masterFrameCount = 0;
      masterActiveFrame = (masterActiveFrame + 1) % masterFrames;
    }

    let mDisplayW = masterFrameW * masterScale;
    let mDisplayH = masterFrameH * masterScale;

    // 位置設定：在玩家左側 250px
    let mX = posX - 550;
    if (mX < 50) mX = posX + 250; // 若太靠左則改到右側
    let mY = height * 0.75 - mDisplayH / 2;
    let mSrcX = masterActiveFrame * masterFrameW;

    push();
    // 繪製 Master
    image(masterImg, mX, mY, mDisplayW, mDisplayH, mSrcX, 0, masterFrameW, masterFrameH);
    // 繪製提示對話框
    drawMasterBubble(mX + mDisplayW / 2, mY);
    pop();
  }

  // 繪製玩家（移至 NPC 之後，確保在最上層）
  push();
  if (direction === -1) {
    // 翻轉顯示（以 drawX 為左上角）
    translate(drawX + displayW, drawY);
    scale(-1, 1);
    image(spriteImg, 0, 0, displayW, displayH, srcX, 0, frameWidth, frameHeight);
  } else {
    translate(drawX, drawY);
    image(spriteImg, 0, 0, displayW, displayH, srcX, 0, frameWidth, frameHeight);
  }
  pop();

  // 顯示邊界提示文字
  // 當在 Background2, Background3 時，走到最左邊時，顯示 "你已回答過上一題"
  if ((currentBg === 2 || currentBg === 3) && posX <= displayW / 2 + 10) {
    push();
    fill(255, 0, 0);
    textAlign(CENTER, BOTTOM);
    textSize(24);
    text("你已回答過上一題", posX, drawY - 20);
    pop();
  }

  // 在 Background1, Background2, Background3 時，還沒回答問題走到最右邊時，顯示 "尚未開啟下一題"
  if (currentBg <= 3 && !isStageCleared && posX >= width - displayW / 2 - 10) {
    push();
    fill(255, 0, 0);
    textAlign(CENTER, BOTTOM);
    textSize(24);
    text("尚未開啟下一題", posX, drawY - 20);
    pop();
  }

  // 靠近距離閾值（供所有 NPC 使用）
  const proximityThreshold = 140;

  // Makoto 靠近判定與互動（與 Cirno 類似）
  const makotoCenterX = makotoX + (makotoFrameW * makotoScale) / 2;
  const distToMakoto = (currentBg === 2) ? abs(posX - makotoCenterX) : Infinity;
  
  // 檢查玩家是否靠近 Cirno（以角色中心到精靈中心距離判斷）
  const cirnoCenterX = cirnoX + (cirnoFrameW * spriteScale) / 2;
  const distToCirno = (currentBg === 1) ? abs(posX - cirnoCenterX) : Infinity;

  // Hello Kitty 靠近判定
  const helloKittyCenterX = helloKittyX + (helloKittyFrameW * helloKittyScale) / 2;
  const distToHelloKitty = (currentBg === 3) ? abs(posX - helloKittyCenterX) : Infinity;

  // 更新距離紀錄
  lastDistToCirno = distToCirno;
  lastDistToMakoto = distToMakoto;
  
  // 決定互動對象
  let newActiveNPC = null;
  if (distToCirno <= proximityThreshold && distToMakoto <= proximityThreshold) {
    newActiveNPC = (distToCirno < distToMakoto) ? 'cirno' : 'makoto';
  } else if (distToCirno <= proximityThreshold) {
    newActiveNPC = 'cirno';
  } else if (distToMakoto <= proximityThreshold) {
    newActiveNPC = 'makoto';
  } else if (distToHelloKitty <= proximityThreshold) {
    newActiveNPC = 'hellokitty';
  }

  // 狀態管理
  if (newActiveNPC && activeNPC !== newActiveNPC && interactionState === 'none') {
    // 靠近新的 NPC，開始提問
    activeNPC = newActiveNPC;
    interactionState = 'questioning';
    startQuestion();
  } else if (!newActiveNPC && activeNPC) {
    // 離開所有 NPC
    resetInteraction();
  }

  // 繪製 UI
  if (interactionState !== 'none') {
    let anchorX, anchorY;
    if (activeNPC === 'cirno') {
      anchorX = cirnoCenterX;
      anchorY = cirnoY;
    } else if (activeNPC === 'makoto') {
      anchorX = makotoCenterX;
      anchorY = makotoY;
    } else if (activeNPC === 'hellokitty') {
      anchorX = helloKittyCenterX;
      anchorY = helloKittyY;
    }
    drawQuestionUI(anchorX, anchorY);
  }

  // 更新並繪製所有發射物
  updateProjectiles();

  if (currentBg === 4) {
    textAlign(CENTER, CENTER);
    textSize(64);
    fill(0);
    text("闖關成功", width / 2, height / 2);
  }
}

function startQuestion() {
  // 根據 currentBg 固定題目 (Bg1->0, Bg2->1, Bg3->2)，確保不重複
  let qIndex = (currentBg - 1);
  if (qIndex >= quizTable.getRowCount()) qIndex = 0; // 防止索引超出
  const row = quizTable.getRow(qIndex);
  currentQuestion = {
    question: row.getString('question'),
    answer: row.getString('answer'),
    correct_feedback: row.getString('correct_feedback'),
    incorrect_feedback: row.getString('incorrect_feedback'),
    hint: row.getString('hint')
  };
  
  questionStartTime = millis();
  showMaster = false;

  // 顯示輸入框和按鈕
  answerInput.show();
  submitButton.show();
  submitButton.mousePressed(submitAnswer);
}

function resetInteraction() {
  activeNPC = null;
  interactionState = 'none';
  currentQuestion = null;
  answerInput.value('');
  answerInput.hide();
  submitButton.hide();
}

function submitAnswer() {
  if (interactionState !== 'questioning') return;

  const userAnswer = answerInput.value().trim();
  if (userAnswer === currentQuestion.answer) {
    isCorrect = true;
    isStageCleared = true;
  } else {
    isCorrect = false;
  }
  interactionState = 'answered';
  answerInput.hide();
  submitButton.hide();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 產生一個發射物物件並加入陣列
function spawnProjectile() {
  // projectile sheet: 5 幀, 740x19
  const pFrameW = 740 / 5;
  const pFrameH = 19;
  // 產生位置在角色前方
  const animFrameW = (prevAnim === 'push') ? (1787 / 8) : 0;
  const spawnX = posX + direction * ((animFrameW * playerScale) / 2 + pFrameW / 2 + 8);
  const baseTopY = height * 0.75 - ((prevAnim === 'push') ? (171) : 180) * playerScale / 2;
  const spawnY = baseTopY + yOffset + ((prevAnim === 'push') ? ((171 * playerScale) / 2 - pFrameH / 2) : 0);

  const proj = {
    x: spawnX,
    y: spawnY,
    dir: direction,
    frame: 0,
    frameCount: 0,
    frameDelay: 6,
    frameW: pFrameW,
    frameH: pFrameH,
    speed: 8,
    img: projectileSheet,
    frames: 5
  };

  projectiles.push(proj);
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    // 移動
    p.x += p.dir * p.speed;

    // 動畫
    p.frameCount++;
    if (p.frameCount >= p.frameDelay) {
      p.frameCount = 0;
      p.frame = (p.frame + 1) % p.frames;
    }

    // 繪製
    push();
    if (p.dir === -1) {
      translate(p.x + p.frameW, p.y);
      scale(-1, 1);
      image(p.img, 0, 0, p.frameW, p.frameH, p.frame * p.frameW, 0, p.frameW, p.frameH);
    } else {
      translate(p.x, p.y);
      image(p.img, 0, 0, p.frameW, p.frameH, p.frame * p.frameW, 0, p.frameW, p.frameH);
    }
    pop();

    // 移除離開畫面的發射物
    if (p.x < -p.frameW || p.x > width + p.frameW) {
      projectiles.splice(i, 1);
    }
  }
}

// 繪製互動選擇題 UI
function drawQuestionUI(anchorX, anchorTopY) {
  const w = min(520, width - 40);
  const h = 140;

  let x = anchorX;
  let y = anchorTopY - h / 2 - 12;

  x = constrain(x, w / 2 + 8, width - w / 2 - 8);
  y = max(h / 2 + 8, y);

  push();
  rectMode(CENTER);
  noStroke();
  fill(0, 180);
  rect(x, y, w, h, 8);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  const pad = 12;
  const left = x - w / 2 + pad * 1.5;
  const top = y - h / 2 + pad * 1.5;

  if (interactionState === 'questioning') {
    // 顯示題目
    text(currentQuestion.question, left, top);
    // 在輸入框上方加入 "請作答"
    fill(220); // 使用稍暗的顏色
    text('請作答:', left, top + 35);
    answerInput.position(left, top + 60);
    answerInput.size(w - pad * 4, 28);
    submitButton.position(answerInput.x + answerInput.width - submitButton.width, answerInput.y + answerInput.height + 8);
  } else if (interactionState === 'answered') {
    let feedbackText, hintText;
    if (isCorrect) {
      fill('#4ade80'); // 綠色
      feedbackText = currentQuestion.correct_feedback;
      hintText = '按 Enter 繼續';
    } else {
      fill('#f87171'); // 紅色
      feedbackText = currentQuestion.incorrect_feedback;
      hintText = `${currentQuestion.hint} (正確答案: ${currentQuestion.answer}) 按 Enter 繼續`;
    }
    textSize(22);
    text(feedbackText, left, top);
    fill(220);
    textSize(14);
    text(hintText, left, y + h / 2 - 30);
  }
  pop();
}

function keyPressed() {
  // 關閉已回答的對話（Enter）
  if (interactionState === 'answered' && keyCode === ENTER) {
    resetInteraction();
  } else if (interactionState === 'questioning' && keyCode === ENTER) {
    submitAnswer();
  } else {
    // 其他按鍵邏輯可以放在這裡，但目前不需要
  }
}

// 繪製 Master 的提示氣泡
function drawMasterBubble(x, y) {
  const isQPressed = keyIsDown(81); // Q 鍵
  const bubbleText = isQPressed ? currentQuestion.answer : "按Q鍵取得提示";
  const bgColor = isQPressed ? color(255, 255, 224) : color(255); // 淺黃色 vs 白色

  push();
  rectMode(CENTER);
  fill(bgColor);
  stroke(0);
  strokeWeight(2);
  rect(x, y - 50, 220, 60, 10);
  
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  text(bubbleText, x, y - 50, 210, 50);
  pop();
}
