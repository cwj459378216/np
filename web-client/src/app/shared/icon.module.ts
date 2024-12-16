import { NgModule } from '@angular/core';
import { IconBell } from '../components/icon/icon-bell';
import { IconMenu } from '../components/icon/icon-menu';
import { IconPlus } from '../components/icon/icon-plus';
import { IconPencil } from '../components/icon/icon-pencil';
import { IconTrashLines } from '../components/icon/icon-trash-lines';
import { IconSquareRotated } from '../components/icon/icon-square-rotated';
import { IconChevronDown } from '../components/icon/icon-chevron-down';
import { IconCircleCheck } from '../components/icon/icon-circle-check';
import { IconXCircle } from '../components/icon/icon-x-circle';
import { IconHorizontalDots } from '../components/icon/icon-horizontal-dots';

@NgModule({
  imports: [
    IconBell,
    IconMenu,
    IconPlus,
    IconPencil,
    IconTrashLines,
    IconSquareRotated,
    IconChevronDown,
    IconCircleCheck,
    IconXCircle,
    IconHorizontalDots
  ],
  exports: [
    IconBell,
    IconMenu,
    IconPlus,
    IconPencil,
    IconTrashLines,
    IconSquareRotated,
    IconChevronDown,
    IconCircleCheck,
    IconXCircle,
    IconHorizontalDots
  ]
})
export class IconModule { } 