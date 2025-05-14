<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Ken Muvatsi | Portfolio Under Construction</title>
    <link rel="icon" type="image/x-icon" href="https://hpanel.hostinger.com/favicons/hostinger.png">
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
    <meta name="description" content="Ken Mutvatsi personal portfolio – coming soon" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet" />

    <style>
      :root {
        --brand: #673de6;
        --bg: #f4f5ff;
        --text: #36344d;
        --sub: #727586;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100vw;
        height: 100vh;
        min-height: 675px;
        background-color: var(--bg);
        font-family: "DM Sans", sans-serif;
        color: var(--text);
      }

      h1 {
        font-size: 32px;
        font-weight: 700;
        margin: 16px 0 8px 0;
        text-align: center;
      }

      p {
        font-size: 16px;
        text-align: center;
        max-width: 550px;
        color: var(--sub);
        margin-bottom: 24px;
      }

      .main-image {
        width: 100%;
        max-width: 480px;
        height: auto;
        border-radius: 12px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
        object-fit: cover;
      }

      @media (max-width: 580px) {
        h1,
        p {
          width: 80%;
        }
      }
    </style>
  </head>
  <body>
    <div class="content">
      <!-- ken.jpg should be uploaded to the same folder as this index.html or adjust the path accordingly -->
      <img
        src="ken.jpg"
        alt="Ken Muvatsi on a rooftop with city skyline, working vibe"
        class="main-image"
      />
      <h1>Ken Muvatsi</h1>
      <p>Portfolio in progress – check back soon</p>
    </div>
  </body>
</html>