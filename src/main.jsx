import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './layout.css' // после index.css: при конфликте правил побеждают новые стили
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import { CartProvider } from './context/CartContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Корзина нужна в шапке, в карточках и на /cart, поэтому её провайдер — над всем App (ЛР13) */}
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>,
)
