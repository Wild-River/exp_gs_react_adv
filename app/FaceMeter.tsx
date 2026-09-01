'use client'
// src/app/FaceMeter.tsx

import { useEffect, useRef, useState } from 'react'

export default function FaceMeter({
  onScore,
}: {
  onScore: (n: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [smile, setSmile] = useState(0)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    let stream: MediaStream | null = null // 片付けでカメラを止めるために保持
    let cancelled = false // 片付け済みなら以降の処理をやめる印

    async function start() {
      //  "use client" と書いても、Next.js は最初の1回だけサーバー側でもファイルを読み込む
      const faceapi = await import('@vladmandic/face-api')

      await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      await faceapi.nets.faceExpressionNet.loadFromUri('/models')
      if (cancelled) return

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop()) // 使わないので即止める
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // ← srcObject 代入だけだと再生されず真っ黒な環境がある
          // ← .catch() は「開発モードの2回実行」で出る AbortError を無視するため
          await videoRef.current.play().catch(() => {})
        }
      } catch (e) {
        console.error(e)
        alert(
          'カメラを使えませんでした。ブラウザのアドレスバーでカメラを『許可』してから、ページを再読み込みしてください。',
        )
        return
      }

      // ④ 0.5秒ごとに表情を測る
      timer = setInterval(async () => {
        if (!videoRef.current) return
        const result = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions(),
          )
          .withFaceExpressions()
        if (result) {
          const happy = Math.round(result.expressions.happy * 100)
          setSmile(happy)
          onScore(happy) // onScore(happy)を実行すると、実体はsetSmileScore(happy)なので、親のstateが更新される
        }
      }, 500)
    }

    start()

    // 片付け（画面を離れたとき／開発モードの2回目実行の前に呼ばれる）
    return () => {
      cancelled = true // 片付け① 読み込み中に画面を離れていたら、ここで終わる
      clearInterval(timer) // 片付け② 0.5秒ごとの測定を止める
      stream?.getTracks().forEach((t) => t.stop()) // 片付け③ ページを離れたらカメラを止める
    }
    // []の中にonScoreは書かない。onScore={(n) => setSmileScore(n)にすると毎回カメラが再起動するので注意）
  }, [])

  return (
    <div>
      <div className="flex justify-center items-center text-center text-lg font-semibold">
        <span className="ml-2">今の笑顔率 {smile}%</span>
      </div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="rounded-2xl mb-4"
      />
    </div>
  )
}
