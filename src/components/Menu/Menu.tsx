/*
Copyright © 2024 The Flux Editor Contributors.

This file is part of Flux Editor.

Flux Editor is free software: you can redistribute it and/or modify it under the terms of the GNU General
Public License as published by the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

Flux Editor is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Flux Editor. If not, see
<https://www.gnu.org/licenses/>.
*/

// TODO: Optimize this, add keyboard shortcuts support

import { createSignal, JSX, Show } from "solid-js";
import ButtonBg from "../../ui/ButtonBg";
import Submenu from "./Submenu";
import { about, license, licenseThirdParty, settings } from "../../menuActions";
import { saveFile } from "../Editor/EditorComponent";
import { appWindow } from "@tauri-apps/api/window";

const [showMenu, setShowMenu] = createSignal(false);

export const MenuContainer = (props: { children: JSX.Element }) => {
  return <div class="mt-1 rounded-xl shadow-xl">{props.children}</div>;
};

const MenuItem = (props: {
  first?: boolean;
  last?: boolean;
  item: number;
  text: string;
  separator?: boolean;
  width?: string;
  action?: () => void;
}) => {
  return (
    <div
      class={`${props.first ? "rounded-t-xl" : ""} ${props.last ? "rounded-b-xl" : ""} ${props.separator ? "border-b-[1px] border-content" : ""} ${props.width ? `${props.width}` : "w-32"} absolute z-[51] flex h-6 cursor-pointer items-center bg-base-100 pl-3 align-middle text-sm hover:bg-base-100-hover`}
      style={{ top: `calc(${props.item} * 1.5rem + 1rem)` }}
      onClick={() => {
        setShowMenu(false);
        if (props.action) {
          props.action();
        }
      }}
    >
      {props.text}
    </div>
  );
};

const Menu = () => {
  return (
    <div>
      <ButtonBg
        width="60px"
        height="30px"
        text="Menu"
        action={() => setShowMenu(!showMenu())}
      />
      <Show when={showMenu()}>
        <MenuContainer>
          <Submenu text="File" item={1} main={true} first={true}>
            <MenuItem first={true} item={1} text="New File" />
            <MenuItem item={2} text="New Project" separator={true} />
            <MenuItem item={3} text="Open..." />
            <MenuItem item={4} text="Save" action={() => saveFile()} />
            <MenuItem
              item={5}
              text="Save As..."
              separator={true}
              action={() => saveFile(true)}
            />
            <MenuItem item={6} text="Settings" action={() => settings()} />
            <MenuItem
              last={true}
              item={7}
              text="Quit"
              action={() => appWindow.close()}
            />
          </Submenu>
          <Submenu text="Edit" item={2} main={true}>
            <MenuItem first={true} item={1} text="Undo" />
            <MenuItem item={2} text="Redo" separator={true} />
            <MenuItem item={3} text="Cut" />
            <MenuItem item={4} text="Copy" />
            <MenuItem item={5} text="Paste" />
            <MenuItem item={6} text="Select All" separator={true} />
            <MenuItem item={7} text="Find" />
            <MenuItem last={true} item={8} text="Replace" />
          </Submenu>
          <Submenu text="View" item={3} main={true}>
            <MenuItem first={true} item={1} text="Themes" />
            <MenuItem item={2} text="Focus Mode" />
            <MenuItem last={true} item={3} text="Fullscreen" />
          </Submenu>
          <Submenu text="Modules" item={4} main={true}>
            <MenuItem first={true} item={1} text="Search" />
            <MenuItem item={2} text="File Browser" />
            <MenuItem last={true} item={3} text="Terminal" />
          </Submenu>
          <Submenu text="Help" item={5} main={true} last={true}>
            <MenuItem
              first={true}
              item={1}
              text="About"
              width="w-40"
              action={() => about()}
            />
            <MenuItem
              item={2}
              text="License"
              width="w-40"
              action={() => license()}
            />
            <MenuItem
              last={true}
              item={3}
              text="Third Party Licenses"
              width="w-40"
              action={() => licenseThirdParty()}
            />
          </Submenu>
        </MenuContainer>
      </Show>
    </div>
  );
};

export default Menu;