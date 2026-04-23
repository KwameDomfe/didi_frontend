import React from 'react'
import { RxCross2, RxHamburgerMenu } from 'react-icons/rx'

const MenuIcon = ({ onClick, isOpen = false }) => {
    return (
        <div>
            <button 
                className="flex items-center justify-center dn-m 
                    gold0 bg-transparent 
                    pa-0 ma-0 outline-none 
                    border-none ba b--gold0 br0-25 pa0-25
               
                    pointer " 
                type="button"
                onClick={onClick}
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
                
                {
                    isOpen 
                    ? <RxCross2 size={22} /> 
                    : <RxHamburgerMenu size={22} />
                }
             
            </button>
        </div>
        
    )
}

export default MenuIcon